import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { CheckCircle2, XCircle, AlertTriangle, Camera, RefreshCw, ArrowLeft, Keyboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchAdminSession, useAdminSession, signOutAdmin } from "@/lib/auth";
import { verifyQrToken } from "@/lib/qrToken";

type ResultKind = "admitted" | "already" | "pending" | "rejected" | "not_paid" | "invalid" | null;
interface ResultState {
  kind: ResultKind;
  name?: string;
  tier?: string;
  enteredAt?: string;
  message?: string;
}

const COLORS: Record<Exclude<ResultKind, null>, string> = {
  admitted: "#16A34A",
  already: "#DC2626",
  pending: "#D97706",
  rejected: "#991B1B",
  not_paid: "#EA580C",
  invalid: "#991B1B",
};

const AUTO_DISMISS_MS = 3000;

const AdminScanEntry = () => {
  const session = useAdminSession();
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "qr-entry-reader";
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ResultState>({ kind: null });
  const [count, setCount] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [manualCode, setManualCode] = useState("");
  const [showManual, setShowManual] = useState(false);
  const inIframe = typeof window !== 'undefined' && window.self !== window.top;
  const processingRef = useRef(false);

  // Auth gate
  useEffect(() => {
    fetchAdminSession().then(s => {
      if (!s) { navigate('/sg26-staff/login'); return; }
      if (s.role !== 'door_in' && s.role !== 'superadmin') {
        navigate('/admin');
      }
    });
  }, [navigate]);

  const loadCount = useCallback(async () => {
    const { count: c } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('entered', true);
    setCount(c || 0);
  }, []);

  useEffect(() => { loadCount(); }, [loadCount]);

  const startScanner = useCallback(async () => {
    setError("");
    try {
      const html5 = new Html5Qrcode(containerId, { verbose: false });
      scannerRef.current = html5;
      await html5.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 280 } },
        (decoded) => handleDecoded(decoded),
        () => { /* ignore per-frame decode errors */ }
      );
      setRunning(true);
    } catch (e: any) {
      setError(e?.message || "Failed to access camera. Allow camera permission and retry.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopScanner = useCallback(async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s) {
      try { await s.stop(); } catch {}
      try { await s.clear(); } catch {}
    }
    setRunning(false);
  }, []);

  // Do NOT auto-start the camera — browsers require a user gesture, and
  // the Lovable preview iframe blocks getUserMedia entirely. Staff tap "Start camera".
  useEffect(() => {
    return () => { stopScanner(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logScan = async (userId: string | null, scannedCode: string | null, resultStr: string) => {
    try {
      await supabase.from('scan_logs').insert({
        user_id: userId,
        scanned_code: scannedCode,
        gate: 'entry',
        result: resultStr,
        scanned_by_user_id: session?.userId || null,
        scanned_by_email: session?.email || null,
      });
    } catch {}
  };

  const handleDecoded = async (raw: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    try { await scannerRef.current?.pause(true); } catch {}

    const verified = await verifyQrToken(raw);
    if (!verified.valid) {
      await logScan(null, verified.code || raw, 'invalid');
      setResult({ kind: 'invalid' });
    } else {
      const { data: u } = await supabase
        .from('users')
        .select('id, first_name, last_name, payment_status, ticket_state, entered, entered_at, tier_id, qr_version, ticket_tiers:ticket_tiers!users_tier_id_fkey(name)')
        .eq('id', verified.userId!).maybeSingle();
      if (!u) {
        await logScan(null, verified.code || null, 'invalid');
        setResult({ kind: 'invalid' });
      } else if (verified.qrVersion !== undefined && (u as any).qr_version !== undefined && verified.qrVersion < ((u as any).qr_version || 1)) {
        await logScan(u.id, verified.code || null, 'invalid_reprinted');
        setResult({ kind: 'invalid', name: `${u.first_name} ${u.last_name}` });
      } else if ((u as any).ticket_state === 'rejected') {
        await logScan(u.id, verified.code || null, 'rejected');
        setResult({ kind: 'rejected', name: `${u.first_name} ${u.last_name}` });
      } else if ((u as any).ticket_state === 'pending') {
        await logScan(u.id, verified.code || null, 'pending');
        setResult({ kind: 'pending', name: `${u.first_name} ${u.last_name}` });
      } else if (u.payment_status !== 'paid') {
        await logScan(u.id, verified.code || null, 'not_paid');
        setResult({ kind: 'not_paid', name: `${u.first_name} ${u.last_name}` });
      } else if (u.entered) {
        await logScan(u.id, verified.code || null, 'already_entered');
        setResult({ kind: 'already', name: `${u.first_name} ${u.last_name}`, enteredAt: u.entered_at || '' });
      } else {
        await supabase.from('users').update({ entered: true, entered_at: new Date().toISOString() }).eq('id', u.id);
        await logScan(u.id, verified.code || null, 'admitted');
        const tierName = Array.isArray((u as any).ticket_tiers) ? (u as any).ticket_tiers?.[0]?.name : (u as any).ticket_tiers?.name;
        setResult({ kind: 'admitted', name: `${u.first_name} ${u.last_name}`, tier: tierName });
      }
    }

    loadCount();
    setTimeout(() => {
      setResult({ kind: null });
      processingRef.current = false;
      try { scannerRef.current?.resume(); } catch {}
    }, AUTO_DISMISS_MS);
  };

  const handleManualSubmit = async () => {
    const c = manualCode.trim().toUpperCase();
    if (!c) return;
    setShowManual(false);
    setManualCode("");
    await handleDecoded(c.startsWith('SG-') ? c : `SG-${c}`);
  };

  const dismiss = () => {
    setResult({ kind: null });
    processingRef.current = false;
    try { scannerRef.current?.resume(); } catch {}
  };

  const showResult = result.kind !== null;
  const bg = showResult ? COLORS[result.kind!] : '#000';

  return (
    <div className="fixed inset-0 z-50 flex flex-col text-white" style={{ background: bg, transition: 'background 0.2s' }}>
      <header className="h-14 flex items-center justify-between px-4 bg-black/40 backdrop-blur-sm shrink-0">
        <button onClick={async () => { await stopScanner(); navigate(session?.role === 'superadmin' ? '/admin' : '/sg26-staff/login'); if (session?.role !== 'superadmin') await signOutAdmin(); }}
          className="flex items-center gap-2 text-sm text-white/80 hover:text-white">
          <ArrowLeft size={16} /> Exit
        </button>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/60">Entry Gate</div>
          <div className="text-sm font-semibold">Admitted tonight: {count}</div>
        </div>
        <div className="text-[11px] text-white/60 max-w-[100px] truncate text-right">{session?.email}</div>
      </header>

      <div className="flex-1 relative overflow-hidden">
        <div id={containerId} className="absolute inset-0 [&_video]:!w-full [&_video]:!h-full [&_video]:object-cover" />
        {!showResult && !running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 gap-4">
            <Camera size={56} className="text-white/80" />
            <h2 className="text-2xl font-bold">Entry Scanner</h2>
            <p className="text-sm text-white/70 max-w-xs">Tap below to activate the camera. Allow camera access when your browser asks.</p>
            {inIframe && (
              <p className="text-xs text-amber-300 max-w-xs">⚠ You're viewing this inside the Lovable preview — the camera is blocked here. Open the published site on your phone for scanning.</p>
            )}
            <button onClick={startScanner}
              className="mt-2 px-6 py-3 rounded-lg bg-white text-black font-semibold inline-flex items-center gap-2">
              <Camera size={18} /> Start camera
            </button>
            <button onClick={() => setShowManual(true)}
              className="mt-2 px-4 py-2 rounded-lg bg-white/10 text-white text-sm inline-flex items-center gap-2">
              <Keyboard size={14} /> Enter code manually
            </button>
            {error && (
              <div className="mt-3 max-w-sm px-4">
                <p className="text-xs text-red-300">{error}</p>
                <button onClick={startScanner} className="mt-2 px-4 py-1.5 rounded bg-white/10 text-xs inline-flex items-center gap-1">
                  <RefreshCw size={12} /> Retry
                </button>
              </div>
            )}
          </div>
        )}
        {!showResult && running && (
          <>
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[280px] h-[280px] border-2 border-white/70 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
            </div>
            <div className="absolute bottom-6 inset-x-0 text-center text-white/80 flex flex-col items-center gap-2">
              <Camera className="mx-auto mb-2" size={28} />
              <p className="font-semibold">Scan Ticket</p>
              <p className="text-xs text-white/60">Point camera at the QR code</p>
              <button onClick={() => setShowManual(true)}
                className="mt-2 px-3 py-1.5 rounded bg-white/10 text-xs inline-flex items-center gap-2">
                <Keyboard size={12} /> Enter code manually
              </button>
            </div>
          </>
        )}

        {showManual && !showResult && (
          <div className="absolute inset-0 z-10 bg-black/80 flex items-center justify-center px-6">
            <div className="w-full max-w-xs bg-zinc-900 rounded-xl p-5 space-y-3">
              <h3 className="font-semibold">Enter ticket code</h3>
              <div className="flex">
                <span className="px-3 py-2 bg-white/10 text-white/70 text-sm rounded-l border border-r-0 border-white/20">SG-</span>
                <input autoFocus value={manualCode} onChange={(e) => setManualCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  className="flex-1 px-3 py-2 bg-black border border-white/20 rounded-r text-white font-mono"
                  placeholder="4821" inputMode="numeric" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowManual(false); setManualCode(""); }} className="flex-1 py-2 rounded bg-white/10 text-sm">Cancel</button>
                <button onClick={handleManualSubmit} className="flex-1 py-2 rounded bg-white text-black text-sm font-semibold">Check</button>
              </div>
            </div>
          </div>
        )}

        {showResult && (
          <button onClick={dismiss} className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            {result.kind === 'admitted' && (
              <>
                <CheckCircle2 size={140} strokeWidth={2.2} />
                <h2 className="text-5xl font-extrabold mt-4 tracking-wide">ADMITTED</h2>
                <p className="text-3xl mt-4">{result.name}</p>
                {result.tier && <p className="text-lg mt-2 text-white/80">{result.tier}</p>}
                <p className="text-xl mt-6">Welcome!</p>
              </>
            )}
            {result.kind === 'already' && (
              <>
                <XCircle size={140} strokeWidth={2.2} />
                <h2 className="text-5xl font-extrabold mt-4 tracking-wide">ALREADY SCANNED</h2>
                <p className="text-3xl mt-4">{result.name}</p>
                {result.enteredAt && (
                  <p className="text-base mt-3 text-white/80">First entered at {new Date(result.enteredAt).toLocaleString('en-RW', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                )}
                <p className="text-lg mt-6 font-semibold">This ticket has already been used.</p>
              </>
            )}
            {result.kind === 'not_paid' && (
              <>
                <AlertTriangle size={140} strokeWidth={2.2} />
                <h2 className="text-5xl font-extrabold mt-4 tracking-wide">PAYMENT NOT COMPLETE</h2>
                <p className="text-3xl mt-4">{result.name}</p>
                <p className="text-lg mt-6">This guest has not completed payment. <br/>Do not admit.</p>
              </>
            )}
            {result.kind === 'pending' && (
              <>
                <AlertTriangle size={140} strokeWidth={2.2} />
                <h2 className="text-4xl font-extrabold mt-4 tracking-wide">PENDING</h2>
                <p className="text-3xl mt-4">{result.name}</p>
                <p className="text-lg mt-6">Verify payment at desk before admitting.</p>
              </>
            )}
            {result.kind === 'rejected' && (
              <>
                <XCircle size={140} strokeWidth={2.2} />
                <h2 className="text-5xl font-extrabold mt-4 tracking-wide">DO NOT ADMIT</h2>
                <p className="text-3xl mt-4">{result.name}</p>
                <p className="text-lg mt-6">Payment was rejected. Send to organizers.</p>
              </>
            )}
            {result.kind === 'invalid' && (
              <>
                <XCircle size={140} strokeWidth={2.2} />
                <h2 className="text-5xl font-extrabold mt-4 tracking-wide">INVALID TICKET</h2>
                <p className="text-lg mt-6">This QR code is not valid for this event.</p>
              </>
            )}
            <p className="absolute bottom-6 inset-x-0 text-center text-xs text-white/70">Tap anywhere to scan next</p>
          </button>
        )}
      </div>
    </div>
  );
};

export default AdminScanEntry;
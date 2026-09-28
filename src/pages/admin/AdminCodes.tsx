import { confirmDialog } from "@/lib/confirmDialog";
import AdminLayout from "@/components/admin/AdminLayout";
import { useState, useEffect } from "react";
import { Plus, Copy, Download, Loader2, X, CheckCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateUniversalCode, formatDate, sortSchoolsOtherLast } from "@/lib/format";
import { getAdminSession } from "@/lib/auth";
import { logAgentAction } from "@/lib/agentLog";

const statusColors: Record<string, string> = {
  used: "bg-green-900/30 text-green-400",
  unused: "bg-gold/10 text-gold",
  disabled: "bg-muted text-muted-foreground",
};

const AdminCodes = () => {
  const [codes, setCodes] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [count, setCount] = useState<string>("");
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [filterSchool, setFilterSchool] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'momo'>('cash');
  const [digitCount, setDigitCount] = useState<3 | 4>(4);
  const [codeType, setCodeType] = useState<'student' | 'general'>('student');
  const [filterMethod, setFilterMethod] = useState("");
  const [filterCreatedBy, setFilterCreatedBy] = useState("");
  const session = getAdminSession();
  const isAdmin = session?.role === 'superadmin';

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [{ data: codesData, error: codesError }, { data: schoolsData, error: schoolsError }] = await Promise.all([
      supabase.from('codes').select('*, users:users!fk_codes_used_by(first_name, last_name), schools(name, prefix)').order('created_at', { ascending: false }),
      supabase.from('schools').select('*').eq('status', 'active').order('name'),
    ]);

    if (codesError) {
      toast.error("Failed to load codes");
      setCodes([]);
    } else {
      setCodes(codesData || []);
    }

    if (schoolsError) {
      toast.error("Failed to load schools");
      setSchools([]);
      setLoading(false);
      return;
    }

    const sorted = sortSchoolsOtherLast(schoolsData || []);
    setSchools(sorted);
    if (sorted.length && !selectedSchoolId) setSelectedSchoolId(sorted[0].id);
    setLoading(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied ${code}`);
  };

  const selectedSchool = schools.find(s => s.id === selectedSchoolId);
  const previewExample = digitCount === 3 ? `SG-482` : `SG-4821`;

  const handleGenerate = async () => {
    const num = parseInt(count);
    if (!num || num < 1 || num > 500) { toast.error("Enter a number between 1 and 500"); return; }
    let school: any = null;
    if (codeType === 'student') {
      if (!selectedSchoolId) { toast.error("Select a school"); return; }
      school = schools.find(s => s.id === selectedSchoolId);
      if (!school) return;
    }
    setGenerating(true);
    toast.loading(`Generating ${num} ${codeType === 'general' ? 'general public' : school.name} code(s)...`);
    try {
      // Fetch ALL existing SG-#### codes (universal namespace)
      const { data: existingData } = await supabase.from('codes').select('code').like('code', 'SG-%');
      const existingCodes = (existingData || []).map(c => c.code);

      const newCodes = [];
      for (let i = 0; i < num; i++) {
        const code = generateUniversalCode([...existingCodes, ...newCodes.map(c => c.code)], digitCount);
        newCodes.push({
          code,
          status: 'unused',
          school_id: school ? school.id : null,
          code_type: codeType,
          payment_method: paymentMethod,
          created_by: session?.email || session?.name || 'unknown',
          fee_amount: 0,
        });
      }
      const { error } = await supabase.from('codes').insert(newCodes);
      if (error) throw error;
      toast.dismiss();
      setShowModal(false);
      setCount("");
      setGeneratedCodes(newCodes.map(c => c.code));
      setSessionCount(prev => prev + newCodes.length);
      await logAgentAction('codes_generated', `Generated ${newCodes.length} ${paymentMethod} ${codeType} code(s) for ${school ? school.name : 'General Public'}`, school ? { type: 'school', id: school.id } : { type: 'school', id: 'general' });
      await loadData();
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message || "Failed to generate codes");
    }
    setGenerating(false);
  };

  const copyAllGenerated = () => {
    navigator.clipboard.writeText(generatedCodes.join('\n'));
    toast.success(`Copied ${generatedCodes.length} code(s)`);
  };

  const toggleStatus = async (id: string, current: string) => {
    const newStatus = current === 'disabled' ? 'unused' : 'disabled';
    const { error } = await supabase.from('codes').update({ status: newStatus }).eq('id', id);
    if (error) {
      toast.error(error.message || "Failed to update code");
      return;
    }
    await loadData();
    toast.success(`Code ${newStatus}`);
  };

  const deleteCode = async (c: any) => {
    if (c.status === 'used') { toast.error("Can't delete a used code. Delete the registration first."); return; }
    const ok = await confirmDialog({ title: `Delete code ${c.code}?`, description: 'This cannot be undone.', confirmText: 'Delete code', destructive: true });
    if (!ok) return;
    const { error } = await supabase.from('codes').delete().eq('id', c.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Code deleted");
    await logAgentAction('code_deleted', `Deleted code ${c.code}`, { type: 'code', id: c.id });
    loadData();
  };

  const exportUnused = () => {
    const unused = filtered.filter(c => c.status === 'unused');
    const csv = 'Code,School,Created At\n' + unused.map(c => `${c.code},${c.schools?.name || ''},${c.created_at}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'unused-codes.csv'; a.click();
    toast.success("Exported unused codes");
  };

  const filtered = codes.filter(c => {
    if (filterSchool && c.school_id !== filterSchool) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    if (filterMethod && c.payment_method !== filterMethod) return false;
    if (filterCreatedBy && c.created_by !== filterCreatedBy) return false;
    return true;
  });

  const uniqueCreators = Array.from(new Set(codes.map(c => c.created_by).filter(Boolean)));

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <p className="text-sm text-muted-foreground">{codes.length} codes · {codes.filter(c => c.status === 'unused').length} unused</p>
          {sessionCount > 0 && (
            <div className="px-3 py-1.5 bg-gold/10 border border-gold/30 rounded-lg text-xs text-gold font-body">
              This session: <span className="font-bold">{sessionCount}</span> code(s) generated
            </div>
          )}
          <select value={filterSchool} onChange={(e) => setFilterSchool(e.target.value)} className="px-3 py-2 bg-surface-2 border border-gold/20 rounded-lg text-sm text-foreground focus:outline-none focus:border-gold/60">
            <option value="">All Schools</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 bg-surface-2 border border-gold/20 rounded-lg text-sm text-foreground focus:outline-none focus:border-gold/60">
            <option value="">All Status</option>
            <option value="unused">Unused</option><option value="used">Used</option><option value="disabled">Disabled</option>
          </select>
          <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} className="px-3 py-2 bg-surface-2 border border-gold/20 rounded-lg text-sm text-foreground focus:outline-none focus:border-gold/60">
            <option value="">All Methods</option>
            <option value="cash">Cash</option>
            <option value="momo">MoMo</option>
          </select>
          {isAdmin && uniqueCreators.length > 0 && (
            <select value={filterCreatedBy} onChange={(e) => setFilterCreatedBy(e.target.value)} className="px-3 py-2 bg-surface-2 border border-gold/20 rounded-lg text-sm text-foreground focus:outline-none focus:border-gold/60">
              <option value="">All Agents</option>
              {uniqueCreators.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          )}
        </div>
        <div className="flex gap-3">
          {isAdmin && (
            <button onClick={exportUnused} className="px-4 py-2 text-sm bg-gold/10 text-gold border border-gold/20 rounded-lg hover:bg-gold/20 transition-colors flex items-center gap-2">
              <Download size={14} /> Export Unused
            </button>
          )}
          <button onClick={() => setShowModal(true)} className="px-4 py-2 text-sm bg-gold text-background rounded-lg hover:bg-gold-light transition-colors flex items-center gap-2">
            <Plus size={14} /> Generate Codes
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-background/60 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="gold-card rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-xl text-gold-gradient mb-4">Generate Codes</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Code type</label>
                <div className="flex gap-3">
                  <button onClick={() => setCodeType('student')}
                    className={`flex-1 py-2 rounded-lg text-sm border transition-all ${codeType === 'student' ? 'border-gold bg-gold/10 text-gold' : 'border-gold/20 text-muted-foreground'}`}>
                    Student
                  </button>
                  <button onClick={() => setCodeType('general')}
                    className={`flex-1 py-2 rounded-lg text-sm border transition-all ${codeType === 'general' ? 'border-gold bg-gold/10 text-gold' : 'border-gold/20 text-muted-foreground'}`}>
                    General / Non-Student
                  </button>
                </div>
              </div>
              {codeType === 'student' && (
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">School (linked to code internally)</label>
                  <select value={selectedSchoolId} onChange={(e) => setSelectedSchoolId(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground focus:outline-none focus:border-gold/60">
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">Codes are universal (SG-####). The school is stored so the student doesn't have to remember it.</p>
                </div>
              )}
              {codeType === 'general' && (
                <p className="text-xs text-muted-foreground bg-gold/5 border border-gold/20 rounded-lg p-3">
                  General public codes — no school required. Useful for families, alumni, and supporters.
                </p>
              )}
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Fee payment method</label>
                <div className="flex gap-3">
                  <button onClick={() => setPaymentMethod('cash')}
                    className={`flex-1 py-2 rounded-lg text-sm border transition-all ${paymentMethod === 'cash' ? 'border-gold bg-gold/10 text-gold' : 'border-gold/20 text-muted-foreground'}`}>
                    Cash
                  </button>
                  <button onClick={() => setPaymentMethod('momo')}
                    className={`flex-1 py-2 rounded-lg text-sm border transition-all ${paymentMethod === 'momo' ? 'border-gold bg-gold/10 text-gold' : 'border-gold/20 text-muted-foreground'}`}>
                    MoMo
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Recorded on the code (manual / exception path).</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Code length</label>
                <div className="flex gap-3">
                  <button onClick={() => setDigitCount(3)}
                    className={`flex-1 py-2 rounded-lg text-sm border transition-all ${digitCount === 3 ? 'border-gold bg-gold/10 text-gold' : 'border-gold/20 text-muted-foreground'}`}>
                    3 digits (SG-###)
                  </button>
                  <button onClick={() => setDigitCount(4)}
                    className={`flex-1 py-2 rounded-lg text-sm border transition-all ${digitCount === 4 ? 'border-gold bg-gold/10 text-gold' : 'border-gold/20 text-muted-foreground'}`}>
                    4 digits (SG-####)
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">3-digit pool is only 900 codes — use 4 for big batches.</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">How many codes?</label>
                <input type="number" min={1} max={500} value={count} placeholder="Enter amount"
                  onChange={(e) => setCount(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground focus:outline-none focus:border-gold/60" />
              </div>
              <p className="text-xs text-muted-foreground">Codes will look like: <span className="font-mono text-gold">{previewExample}</span></p>
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gold/20 text-foreground rounded-lg hover:bg-surface-2">Cancel</button>
                <button onClick={handleGenerate} disabled={generating} className="flex-1 py-2 bg-gold text-background rounded-lg hover:bg-gold-light flex items-center justify-center gap-2 disabled:opacity-50">
                  {generating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {generatedCodes.length > 0 && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="gold-card rounded-2xl p-8 w-full max-w-lg relative">
            <button onClick={() => setGeneratedCodes([])} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-7 h-7 text-gold" />
              </div>
              <h3 className="font-display text-2xl text-gold-gradient">Code Generated</h3>
              <p className="text-sm text-muted-foreground mt-1">Manual code — share with the recipient.</p>
            </div>

            {generatedCodes.length === 1 ? (
              <div className="text-center bg-surface-2 border border-gold/20 rounded-xl py-8 mb-4">
                <p className="font-mono text-4xl md:text-5xl text-gold font-bold tracking-wider">{generatedCodes[0]}</p>
              </div>
            ) : (
              <div className="bg-surface-2 border border-gold/20 rounded-xl p-4 max-h-64 overflow-y-auto mb-4">
                <div className="grid grid-cols-2 gap-2">
                  {generatedCodes.map(c => (
                    <p key={c} className="font-mono text-gold text-center py-2 bg-background/40 rounded">{c}</p>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-center text-muted-foreground mb-6 italic">
              Confirm payment before sharing this code.
            </p>

            <div className="flex gap-3">
              <button onClick={copyAllGenerated} className="flex-1 py-3 bg-gold text-background font-semibold rounded-lg hover:bg-gold-light flex items-center justify-center gap-2">
                <Copy size={16} /> Copy to Clipboard
              </button>
              <button onClick={() => setGeneratedCodes([])} className="flex-1 py-3 border border-gold/30 text-foreground rounded-lg hover:bg-surface-2 flex items-center justify-center gap-2">
                <X size={16} /> Done
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-gold/10 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="text-muted-foreground border-b border-gold/10">
                <th className="text-left p-4">Code</th>
                <th className="text-left p-4 hidden md:table-cell">School</th>
                <th className="text-center p-4">Status</th>
                <th className="text-center p-4 hidden md:table-cell">Method</th>
                <th className="text-left p-4 hidden lg:table-cell">By</th>
                <th className="text-left p-4 hidden md:table-cell">Created</th>
                <th className="text-left p-4 hidden md:table-cell">Used By</th>
                <th className="text-center p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No codes found</td></tr>}
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-gold/5 hover:bg-surface transition-colors">
                  <td className="p-4 font-mono text-gold text-sm">{c.code}</td>
                  <td className="p-4 hidden md:table-cell">
                    {c.code_type === 'general' ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-gold/10 text-gold border border-gold/20">General Public</span>
                    ) : (
                      <span className="text-foreground/70">{c.schools?.name || '-'}</span>
                    )}
                  </td>
                  <td className="p-4 text-center"><span className={`text-xs px-2 py-1 rounded-full capitalize ${statusColors[c.status]}`}>{c.status}</span></td>
                  <td className="p-4 text-center text-foreground/70 hidden md:table-cell uppercase text-xs">{c.payment_method || '-'}</td>
                  <td className="p-4 text-foreground/70 hidden lg:table-cell text-xs">{c.created_by || '-'}</td>
                  <td className="p-4 text-muted-foreground text-xs hidden md:table-cell">{formatDate(c.created_at)}</td>
                  <td className="p-4 text-foreground/70 hidden md:table-cell">{c.users ? `${c.users.first_name} ${c.users.last_name}` : '-'}</td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => copyCode(c.code)} className="p-1.5 rounded bg-gold/10 text-gold hover:bg-gold/20 transition-colors" title="Copy suffix"><Copy size={14} /></button>
                      {isAdmin && c.status !== 'used' && (
                        <>
                          <button onClick={() => toggleStatus(c.id, c.status)} className="text-xs text-muted-foreground hover:text-gold">
                            {c.status === 'disabled' ? 'Enable' : 'Disable'}
                          </button>
                          <button onClick={() => deleteCode(c)} className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors" title="Delete code">
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCodes;

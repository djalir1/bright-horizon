import { toast } from "sonner";

const KEY = "admin_sound_enabled";

export const isSoundEnabled = (): boolean => {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(KEY);
  return v === null ? true : v === "true";
};

export const setSoundEnabled = (on: boolean) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, String(on));
  window.dispatchEvent(new Event("sound-toggle"));
};

let ctx: AudioContext | null = null;
const getCtx = () => {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
};

const chime = (notes: { f: number; t: number; d: number }[], gain = 0.08) => {
  if (!isSoundEnabled()) return;
  const c = getCtx();
  if (!c) return;
  const master = c.createGain();
  master.gain.value = gain;
  master.connect(c.destination);
  notes.forEach(({ f, t, d }) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.value = f;
    const start = c.currentTime + t;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(1, start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, start + d);
    osc.connect(g);
    g.connect(master);
    osc.start(start);
    osc.stop(start + d + 0.05);
  });
};

export const playSuccess = () => chime([{ f: 880, t: 0, d: 0.16 }, { f: 1318, t: 0.09, d: 0.22 }]);
export const playError = () => chime([{ f: 320, t: 0, d: 0.18 }, { f: 220, t: 0.12, d: 0.28 }], 0.1);
export const playInfo = () => chime([{ f: 660, t: 0, d: 0.18 }]);

// Wrap sonner toast methods once so every toast in the app emits a sound.
let installed = false;
export const installToastSounds = () => {
  if (installed) return;
  installed = true;
  const orig = {
    success: toast.success.bind(toast),
    error: toast.error.bind(toast),
    info: (toast as any).info ? (toast as any).info.bind(toast) : null,
    warning: (toast as any).warning ? (toast as any).warning.bind(toast) : null,
  };
  toast.success = ((...args: any[]) => { playSuccess(); return orig.success(...(args as [any])); }) as any;
  toast.error = ((...args: any[]) => { playError(); return orig.error(...(args as [any])); }) as any;
  if (orig.info) (toast as any).info = (...args: any[]) => { playInfo(); return orig.info!(...(args as [any])); };
  if (orig.warning) (toast as any).warning = (...args: any[]) => { playError(); return orig.warning!(...(args as [any])); };
};
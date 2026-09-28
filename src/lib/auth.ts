import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export type AppRole = 'superadmin' | 'agent' | 'door_in' | 'door_out';

export interface AdminSession {
  userId: string;
  email: string;
  name: string;
  /** Primary role for routing/menu. Superadmin > agent > door. */
  role: AppRole;
  roles: AppRole[];
}

function pickPrimary(roles: AppRole[]): AppRole | null {
  if (!roles.length) return null;
  if (roles.includes('superadmin')) return 'superadmin';
  if (roles.includes('agent')) return 'agent';
  if (roles.includes('door_in')) return 'door_in';
  if (roles.includes('door_out')) return 'door_out';
  return roles[0];
}

let cached: AdminSession | null = null;
let inFlight: Promise<AdminSession | null> | null = null;
const listeners = new Set<(s: AdminSession | null) => void>();

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function getCachedAdminSession(): AdminSession | null {
  return cached;
}

/** Back-compat helper kept for older call sites. Returns cached snapshot (sync). */
export function getAdminSession(): AdminSession | null {
  return cached;
}

export function isSuperAdmin(): boolean {
  return cached?.role === 'superadmin';
}

export async function fetchAdminSession(options: { forceRefresh?: boolean; retries?: number } = {}): Promise<AdminSession | null> {
  const { forceRefresh = false, retries = 1 } = options;
  if (inFlight && !forceRefresh) return inFlight;

  inFlight = (async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('[auth] session check failed, keeping cached session', error);
      return cached;
    }

    // During token refreshes or browser storage glitches, getSession can briefly be empty.
    // Never destroy a known-good staff session here; only explicit SIGNED_OUT/logout clears it.
    if (!session?.user) return cached;

    const userId = session.user.id;
    if (!forceRefresh && cached && cached.userId === userId) return cached;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('full_name, email').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId),
      ]);

      if (rolesRes.error) {
        console.warn('[auth] roles query failed, keeping cached session', rolesRes.error);
        if (attempt < retries) await wait(350);
        continue;
      }

      const roles = (rolesRes.data || []).map(r => r.role as AppRole);
      const primary = pickPrimary(roles);
      if (!primary) {
        if (attempt < retries) {
          await wait(350);
          continue;
        }
        return cached?.userId === userId ? cached : null;
      }

      const profile = profileRes.data;
      cached = {
        userId,
        email: profile?.email || session.user.email || '',
        name: profile?.full_name || profile?.email || session.user.email || 'Staff',
        role: primary,
        roles,
      };
      listeners.forEach(l => l(cached));
      return cached;
    }

    return cached?.userId === userId ? cached : null;
  })().finally(() => { inFlight = null; });

  return inFlight;
}

export async function signOutAdmin() {
  cached = null;
  listeners.forEach(l => l(null));
  await supabase.auth.signOut({ scope: 'local' });
}

export function onAdminAuthChange(cb: () => void) {
  const { data } = supabase.auth.onAuthStateChange((event) => {
    // Only react to explicit sign-out / sign-in transitions.
    // Ignore TOKEN_REFRESHED, INITIAL_SESSION, USER_UPDATED, PASSWORD_RECOVERY
    // so a passive token refresh or window-focus event never triggers a re-check
    // that could redirect the user to the login page.
    if (event !== 'SIGNED_OUT' && event !== 'SIGNED_IN') return;
    if (event === 'SIGNED_OUT') {
      cached = null;
      listeners.forEach(l => l(null));
    }
    setTimeout(() => { cb(); }, 0);
  });
  return () => data.subscription.unsubscribe();
}

/** React hook returning the live session. */
export function useAdminSession() {
  const [s, setS] = useState<AdminSession | null>(cached);
  useEffect(() => {
    const handler = (v: AdminSession | null) => setS(v);
    listeners.add(handler);
    if (!cached) fetchAdminSession();
    return () => { listeners.delete(handler); };
  }, []);
  return s;
}

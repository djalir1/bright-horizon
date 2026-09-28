import { supabase } from "@/integrations/supabase/client";
import { getCachedAdminSession } from "@/lib/auth";

export async function logAgentAction(
  action: string,
  details?: string,
  target?: { type?: string; id?: string }
) {
  const session = getCachedAdminSession();
  if (!session) return;
  try {
    await supabase.from('agent_logs').insert({
      agent_name: session.name || session.email || 'unknown',
      agent_role: session.role,
      action,
      target_type: target?.type || null,
      target_id: target?.id || null,
      details: details || null,
    });
  } catch (e) {
    console.error('Failed to log action', e);
  }
}

import AdminLayout from "@/components/admin/AdminLayout";
import { Save, Plus, Trash2, Loader2, Hash, Phone } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import TicketTiersAdmin from "@/components/admin/TicketTiersAdmin";

type MomoMethod = { id: string; label: string; value: string; ussd: string; name: string; type: 'code' | 'number'; enabled: boolean };

const AdminSettings = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [teamMembers, setTeamMembers] = useState<{name: string; role: string; phone: string}[]>([]);
  const [momoMethods, setMomoMethods] = useState<MomoMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const { data } = await supabase.from('settings').select('*');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach(row => { map[row.key] = row.value; });
      setSettings(map);
      try { setTeamMembers(JSON.parse(map.team_members || '[]')); } catch { setTeamMembers([]); }
      try {
        const parsed = JSON.parse(map.momo_methods || '[]');
        setMomoMethods(Array.isArray(parsed) ? parsed : []);
      } catch { setMomoMethods([]); }
    }
    setLoading(false);
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    toast.loading("Saving...");
    try {
      const updated = {
        ...settings,
        team_members: JSON.stringify(teamMembers),
        momo_methods: JSON.stringify(momoMethods),
      };
      for (const [key, value] of Object.entries(updated)) {
        await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
      }
      toast.dismiss();
      toast.success("Settings saved!");
    } catch {
      toast.dismiss();
      toast.error("Failed to save settings.");
    }
    setSaving(false);
  };

  const addMomo = (type: 'code' | 'number') => {
    setMomoMethods([
      ...momoMethods,
      { id: crypto.randomUUID(), label: type === 'code' ? 'MoMo Pay Code' : 'MoMo Phone Number', value: '', ussd: '', name: '', type, enabled: true },
    ]);
  };
  const updateMomo = (id: string, patch: Partial<MomoMethod>) => {
    setMomoMethods(momoMethods.map(m => m.id === id ? { ...m, ...patch } : m));
  };
  const removeMomo = (id: string) => setMomoMethods(momoMethods.filter(m => m.id !== id));

  const Field = ({ label, field, type = "text" }: { label: string; field: string; type?: string }) => (
    <div>
      <label className="text-sm text-muted-foreground mb-1.5 block">{label}</label>
      {type === 'textarea' ? (
        <textarea value={settings[field] || ''} onChange={(e) => updateSetting(field, e.target.value)} rows={3}
          className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60 transition-colors resize-none" />
      ) : type === 'toggle' ? (
        <button onClick={() => updateSetting(field, settings[field] === 'true' ? 'false' : 'true')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${settings[field] === 'true' ? 'bg-gold/10 text-gold border border-gold/30' : 'bg-surface-2 text-muted-foreground border border-gold/10'}`}>
          {settings[field] === 'true' ? 'Enabled' : 'Disabled'}
        </button>
      ) : type === 'select-refresh' ? (
        <select value={settings[field] || 'page_load'} onChange={(e) => updateSetting(field, e.target.value)}
          className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground focus:outline-none focus:border-gold/60">
          <option value="page_load">On page load only</option>
          <option value="30s">Every 30 seconds</option>
          <option value="60s">Every 60 seconds</option>
        </select>
      ) : (
        <input type={type} value={settings[field] || ''} onChange={(e) => updateSetting(field, e.target.value)}
          className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60 transition-colors" />
      )}
    </div>
  );

  if (loading) return <AdminLayout><div className="text-center py-20 text-muted-foreground">Loading settings...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="gold-card rounded-xl p-6 md:p-8 space-y-6">
          <h2 className="font-display text-2xl text-gold-gradient mb-2">Platform Settings</h2>

          <div className="space-y-4">
            <h3 className="font-display text-lg text-foreground border-b border-gold/10 pb-2">Event Details</h3>
            <div className="bg-gold/5 border border-gold/20 rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-gold-gradient">Public Downloads</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Receipt Downloads</p>
                  <p className="text-xs text-muted-foreground">
                    {settings.receipts_enabled === 'true'
                      ? 'Receipts enabled — confirmed attendees can download their receipt'
                      : "Receipts disabled — attendees see a 'not available yet' message"}
                  </p>
                </div>
                <button onClick={async () => {
                  const v = settings.receipts_enabled === 'true' ? 'false' : 'true';
                  updateSetting('receipts_enabled', v);
                  await supabase.from('settings').upsert({ key: 'receipts_enabled', value: v }, { onConflict: 'key' });
                  toast.success('Setting updated.');
                }}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${settings.receipts_enabled === 'true' ? 'bg-gold/20 text-gold border border-gold/40' : 'bg-surface-2 text-muted-foreground border border-gold/10'}`}>
                  {settings.receipts_enabled === 'true' ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Ticket Downloads</p>
                  <p className="text-xs text-muted-foreground">
                    {settings.tickets_enabled === 'true'
                      ? 'Ticket downloads enabled — confirmed attendees can download their ticket'
                      : "Ticket downloads disabled — attendees see a 'coming soon' message"}
                  </p>
                </div>
                <button onClick={async () => {
                  const v = settings.tickets_enabled === 'true' ? 'false' : 'true';
                  updateSetting('tickets_enabled', v);
                  await supabase.from('settings').upsert({ key: 'tickets_enabled', value: v }, { onConflict: 'key' });
                  toast.success('Setting updated.');
                }}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${settings.tickets_enabled === 'true' ? 'bg-gold/20 text-gold border border-gold/40' : 'bg-surface-2 text-muted-foreground border border-gold/10'}`}>
                  {settings.tickets_enabled === 'true' ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="MoMo Number (shown on Register)" field="momo_number" />
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">
                  MoMo Account Name (shown on Register) — optional
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.momo_account_name || ''}
                    onChange={(e) => updateSetting('momo_account_name', e.target.value)}
                    placeholder="Leave blank to hide"
                    className="flex-1 px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      updateSetting('momo_account_name', '');
                      await supabase.from('settings').upsert({ key: 'momo_account_name', value: '' }, { onConflict: 'key' });
                      toast.success('Cleared.');
                    }}
                    className="px-3 py-2 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/20 transition-colors"
                    title="Clear and save"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Leave empty — the account name line will be hidden on the Register page.</p>
              </div>
            </div>
            <Field label="Event Name" field="event_name" />
            <Field label="Event Date & Time" field="event_date" type="datetime-local" />
            <Field label="Venue Name" field="venue_name" />
            <Field label="Venue Address" field="venue_address" />
            <Field label="Venue Status" field="venue_confirmed" type="toggle" />
            <p className="text-xs text-muted-foreground -mt-2">When disabled, "To Be Announced" is shown on the public site instead of the venue name.</p>
            <Field label="Event Description" field="event_description" type="textarea" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Ticket Price (RWF)" field="ticket_price" type="number" />
              <Field label="Registration Fee (RWF)" field="registration_fee" type="number" />
            </div>
            <Field label="Total Seats Available" field="total_seats" type="number" />
            <Field label="Show Seats Counter" field="show_seats_counter" type="toggle" />
            <Field label="Seats Counter Refresh" field="seats_refresh_interval" type="select-refresh" />
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-lg text-foreground border-b border-gold/10 pb-2">Homepage Live Stats</h3>
            <p className="text-xs text-muted-foreground -mb-2">
              Controls the live tickets-sold counter and per-tier badges shown on the public homepage hero.
            </p>
            <Field label="Show on Homepage" field="homepage_show_counter" type="toggle" />
            <Field label="Force 'SOLD OUT' banner (overrides live data)" field="homepage_force_soldout" type="toggle" />
            <Field label="Sold count boost (added to live count, e.g. 25)" field="homepage_sold_offset" type="number" />
            <p className="text-xs text-muted-foreground -mt-2">
              The boost only affects the public display — actual database counts stay accurate.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-lg text-foreground border-b border-gold/10 pb-2">Ticket Tiers</h3>
            <TicketTiersAdmin />
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-lg text-foreground border-b border-gold/10 pb-2">Payment Details</h3>
            <p className="text-xs text-muted-foreground">
              Add a MoMo <strong>Phone Number</strong> or <strong>MoMo Pay Code</strong>. For each one, also enter the full
              <span className="font-mono text-gold"> USSD string</span> (e.g. <span className="font-mono text-gold">*182*1*1*0789483902#</span>
              or <span className="font-mono text-gold">*182*8*1*2993#</span>) — that is what the user copies to dial. Only
              <strong> enabled</strong> methods appear on the public Pay page.
            </p>
            <div className="space-y-3">
              {momoMethods.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No payment methods yet. Add one below.</p>
              )}
              {momoMethods.map((m) => (
                <div key={m.id} className="bg-surface-2 border border-gold/15 rounded-lg p-3 space-y-2">
                  <div className="flex gap-2 items-center">
                    <span className={`p-1.5 rounded ${m.type === 'code' ? 'bg-gold/10 text-gold' : 'bg-green-900/30 text-green-400'}`}>
                      {m.type === 'code' ? <Hash size={14} /> : <Phone size={14} />}
                    </span>
                    <input placeholder="Label (e.g. MTN MoMo)" value={m.label}
                      onChange={(e) => updateMomo(m.id, { label: e.target.value })}
                      className="flex-1 px-3 py-2 bg-background border border-gold/20 rounded text-sm focus:outline-none focus:border-gold/60" />
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="checkbox" checked={m.enabled} onChange={(e) => updateMomo(m.id, { enabled: e.target.checked })}
                        className="accent-gold w-4 h-4" />
                      Enabled
                    </label>
                    <button onClick={() => removeMomo(m.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <input placeholder={m.type === 'code' ? 'MoMo code (e.g. 2993)' : 'Phone number (e.g. 0789 483 902)'} value={m.value}
                    onChange={(e) => updateMomo(m.id, { value: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-gold/20 rounded text-sm font-mono text-gold focus:outline-none focus:border-gold/60" />
                  <input placeholder={m.type === 'code' ? 'Full USSD (e.g. *182*8*1*2993#)' : 'Full USSD (e.g. *182*1*1*0789483902#)'} value={m.ussd}
                    onChange={(e) => updateMomo(m.id, { ussd: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-gold/20 rounded text-sm font-mono text-foreground focus:outline-none focus:border-gold/60" />
                  <input placeholder={m.type === 'code' ? 'Registered name on the MoMo code (e.g. S.A.D Corp)' : 'Registered name on the phone number (e.g. JANE DOE)'} value={m.name || ''}
                    onChange={(e) => updateMomo(m.id, { name: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-gold/20 rounded text-sm text-foreground focus:outline-none focus:border-gold/60" />
                  <p className="text-[11px] text-muted-foreground">The USSD above is what gets copied on the Pay page.</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => addMomo('code')} className="text-sm px-3 py-1.5 rounded bg-gold/10 text-gold hover:bg-gold/20 flex items-center gap-1">
                <Plus size={14} /> Add USSD code
              </button>
              <button onClick={() => addMomo('number')} className="text-sm px-3 py-1.5 rounded bg-gold/10 text-gold hover:bg-gold/20 flex items-center gap-1">
                <Plus size={14} /> Add phone number
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-lg text-foreground border-b border-gold/10 pb-2">Contact Info</h3>
            <Field label="WhatsApp / Phone" field="contact_whatsapp" />
            <Field label="Email Address" field="contact_email" />
            <Field label="Physical Address" field="contact_address" />
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-lg text-foreground border-b border-gold/10 pb-2">Team Members</h3>
            {teamMembers.map((member, i) => (
              <div key={i} className="flex gap-2 items-start">
                <input placeholder="Name" value={member.name} onChange={(e) => { const t = [...teamMembers]; t[i].name = e.target.value; setTeamMembers(t); }}
                  className="flex-1 px-3 py-2 bg-surface-2 border border-gold/20 rounded-lg text-sm text-foreground focus:outline-none focus:border-gold/60" />
                <input placeholder="Role" value={member.role} onChange={(e) => { const t = [...teamMembers]; t[i].role = e.target.value; setTeamMembers(t); }}
                  className="flex-1 px-3 py-2 bg-surface-2 border border-gold/20 rounded-lg text-sm text-foreground focus:outline-none focus:border-gold/60" />
                <input placeholder="Phone" value={member.phone} onChange={(e) => { const t = [...teamMembers]; t[i].phone = e.target.value; setTeamMembers(t); }}
                  className="w-36 px-3 py-2 bg-surface-2 border border-gold/20 rounded-lg text-sm text-foreground focus:outline-none focus:border-gold/60" />
                <button onClick={() => setTeamMembers(teamMembers.filter((_, j) => j !== i))} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button onClick={() => setTeamMembers([...teamMembers, { name: '', role: '', phone: '' }])}
              className="text-sm text-gold hover:text-gold-light flex items-center gap-1"><Plus size={14} /> Add Member</button>
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-lg text-foreground border-b border-gold/10 pb-2">Organizer Info</h3>
            <Field label="S.A.D Corporation Description" field="sad_description" type="textarea" />
            <Field label="Main Contact Phone" field="main_contact_phone" />
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-lg text-foreground border-b border-gold/10 pb-2">Superadmin Credentials</h3>
            <Field label="Username" field="superadmin_username" />
            <Field label="Password" field="superadmin_password" />
          </div>

          <button onClick={handleSave} disabled={saving}
            className="px-6 py-3 bg-gold text-background font-semibold rounded-lg hover:bg-gold-light transition-all hover:scale-[1.02] flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save All Settings
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;

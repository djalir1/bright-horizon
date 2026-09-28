import { confirmDialog } from "@/lib/confirmDialog";
import AdminLayout from "@/components/admin/AdminLayout";
import { Plus, Loader2, Trash2, Edit2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminSchools = () => {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', prefix: '', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});

  useEffect(() => { loadSchools(); }, []);

  const loadSchools = async () => {
    const { data } = await supabase.from('schools').select('*').order('name');
    setSchools(data || []);
    // Get student counts per school
    const { data: users } = await supabase.from('users').select('school_id');
    const counts: Record<string, number> = {};
    (users || []).forEach(u => { if (u.school_id) counts[u.school_id] = (counts[u.school_id] || 0) + 1; });
    setStudentCounts(counts);
    setLoading(false);
  };

  const autoPrefix = (name: string) => {
    const consonants = name.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3);
    return consonants || 'OTH';
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ name: '', prefix: '', status: 'active' });
    setShowModal(true);
  };

  const openEdit = (school: any) => {
    setEditId(school.id);
    setForm({ name: school.name, prefix: school.prefix, status: school.status });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.prefix) { toast.error("Name and prefix are required"); return; }
    if (form.prefix.length < 2 || form.prefix.length > 4) { toast.error("Prefix must be 2-4 characters"); return; }
    setSaving(true);
    toast.loading(editId ? "Updating..." : "Saving...");
    try {
      if (editId) {
        const { error } = await supabase.from('schools').update({ name: form.name, prefix: form.prefix.toUpperCase(), status: form.status }).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('schools').insert({ name: form.name, prefix: form.prefix.toUpperCase(), status: form.status });
        if (error) throw error;
      }
      toast.dismiss();
      toast.success(editId ? "School updated!" : "School added!");
      setShowModal(false);
      loadSchools();
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message?.includes('unique') ? "Prefix already exists" : (e.message || "Failed"));
    }
    setSaving(false);
  };

  const deleteSchool = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete school?', description: "Codes linked to it won't be affected, but the school itself will be removed.", confirmText: 'Delete', destructive: true });
    if (!ok) return;
    await supabase.from('schools').delete().eq('id', id);
    toast.success("School deleted");
    loadSchools();
  };

  const toggleStatus = async (id: string, current: string) => {
    const newStatus = current === 'active' ? 'inactive' : 'active';
    await supabase.from('schools').update({ status: newStatus }).eq('id', id);
    toast.success(`School ${newStatus}`);
    loadSchools();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{schools.length} school(s)</p>
        <button onClick={openAdd} className="px-4 py-2 text-sm bg-gold text-background rounded-lg hover:bg-gold-light transition-colors flex items-center gap-2">
          <Plus size={14} /> Add School
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-background/60 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="gold-card rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-xl text-gold-gradient mb-4">{editId ? 'Edit School' : 'Add School'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">School Name</label>
                <input value={form.name} onChange={(e) => {
                  setForm({ ...form, name: e.target.value, prefix: editId ? form.prefix : autoPrefix(e.target.value) });
                }} className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground focus:outline-none focus:border-gold/60" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Code Prefix (2-4 uppercase letters)</label>
                <input value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) })}
                  className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground font-mono focus:outline-none focus:border-gold/60" />
                <p className="text-xs text-muted-foreground mt-1">Codes will look like: {form.prefix || 'XXX'}-4821</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gold/20 text-foreground rounded-lg hover:bg-surface-2">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-gold text-background rounded-lg hover:bg-gold-light flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null} {editId ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-gold/10 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="text-muted-foreground border-b border-gold/10">
                <th className="text-left p-4">School Name</th>
                <th className="text-left p-4">Prefix</th>
                <th className="text-right p-4">Students</th>
                <th className="text-center p-4">Status</th>
                <th className="text-center p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading...</td></tr>}
              {!loading && schools.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No schools added yet</td></tr>}
              {schools.map((s) => (
                <tr key={s.id} className="border-b border-gold/5 hover:bg-surface transition-colors">
                  <td className="p-4 text-foreground">{s.name}</td>
                  <td className="p-4 font-mono text-gold">{s.prefix}</td>
                  <td className="p-4 text-right text-foreground">{studentCounts[s.id] || 0}</td>
                  <td className="p-4 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${s.status === 'active' ? 'bg-green-900/30 text-green-400' : 'bg-muted text-muted-foreground'}`}>{s.status}</span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded bg-gold/10 text-gold hover:bg-gold/20"><Edit2 size={14} /></button>
                      <button onClick={() => toggleStatus(s.id, s.status)} className="text-xs text-muted-foreground hover:text-gold">
                        {s.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => deleteSchool(s.id)} className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20"><Trash2 size={14} /></button>
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

export default AdminSchools;

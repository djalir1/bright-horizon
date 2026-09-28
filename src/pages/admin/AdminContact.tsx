import { confirmDialog } from "@/lib/confirmDialog";
import AdminLayout from "@/components/admin/AdminLayout";
import { Trash2, Eye, Mail, MailOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

const AdminContact = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMsg, setSelectedMsg] = useState<any>(null);

  useEffect(() => { loadMessages(); }, []);

  const loadMessages = async () => {
    const { data } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
    setMessages(data || []);
    setLoading(false);
  };

  const toggleRead = async (msg: any) => {
    await supabase.from('contact_messages').update({ read: !msg.read }).eq('id', msg.id);
    loadMessages();
  };

  const deleteMessage = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete message?', description: 'This message will be removed permanently.', confirmText: 'Delete', destructive: true });
    if (!ok) return;
    await supabase.from('contact_messages').delete().eq('id', id);
    toast.success("Message deleted");
    loadMessages();
    setSelectedMsg(null);
  };

  return (
    <AdminLayout>
      <p className="text-sm text-muted-foreground mb-6">{messages.filter(m => !m.read).length} unread message(s)</p>

      {selectedMsg && (
        <div className="fixed inset-0 bg-background/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedMsg(null)}>
          <div className="gold-card rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-xl text-gold-gradient mb-2">{selectedMsg.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{selectedMsg.email} · {formatDate(selectedMsg.created_at)}</p>
            <p className="text-foreground whitespace-pre-wrap mb-6">{selectedMsg.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setSelectedMsg(null)} className="flex-1 py-2 border border-gold/20 text-foreground rounded-lg hover:bg-surface-2">Close</button>
              <button onClick={() => deleteMessage(selectedMsg.id)} className="py-2 px-4 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20">Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-gold/10 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="text-muted-foreground border-b border-gold/10">
                <th className="text-center p-4 w-10"></th>
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4 hidden md:table-cell">Email</th>
                <th className="text-left p-4">Message</th>
                <th className="text-left p-4 hidden md:table-cell">Date</th>
                <th className="text-center p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading...</td></tr>}
              {!loading && messages.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No contact messages yet</td></tr>}
              {messages.map((m) => (
                <tr key={m.id} className={`border-b border-gold/5 hover:bg-surface transition-colors ${!m.read ? 'bg-gold/5' : ''}`}>
                  <td className="p-4 text-center">
                    <button onClick={() => toggleRead(m)} className="text-gold/50 hover:text-gold">
                      {m.read ? <MailOpen size={14} /> : <Mail size={14} />}
                    </button>
                  </td>
                  <td className="p-4 text-foreground font-medium">{m.name}</td>
                  <td className="p-4 text-muted-foreground hidden md:table-cell">{m.email}</td>
                  <td className="p-4 text-muted-foreground truncate max-w-xs">{m.message}</td>
                  <td className="p-4 text-muted-foreground text-xs hidden md:table-cell">{formatDate(m.created_at)}</td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => { setSelectedMsg(m); if (!m.read) toggleRead(m); }} className="p-1.5 rounded bg-gold/10 text-gold hover:bg-gold/20"><Eye size={14} /></button>
                      <button onClick={() => deleteMessage(m.id)} className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20"><Trash2 size={14} /></button>
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

export default AdminContact;

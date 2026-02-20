import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Search, MapPin, Phone, User, Plus, MessageSquare, Clock } from 'lucide-react';

interface SalesLead {
  id: string;
  shop_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  postal_code: string | null;
  street: string | null;
  house_number: string | null;
  industry: string | null;
  status: string;
  priority: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface LeadActivity {
  id: string;
  activity_type: string;
  old_value: string | null;
  new_value: string | null;
  note: string | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'Neu', color: 'bg-blue-100 text-blue-800' },
  { value: 'contacted', label: 'Kontaktiert', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'interested', label: 'Interessiert', color: 'bg-green-100 text-green-800' },
  { value: 'offer_sent', label: 'Angebot gesendet', color: 'bg-purple-100 text-purple-800' },
  { value: 'negotiating', label: 'Verhandlung', color: 'bg-orange-100 text-orange-800' },
  { value: 'converted', label: 'Abgeschlossen', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'lost', label: 'Verloren', color: 'bg-gray-100 text-gray-600' },
];

export default function PartnerLeads() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState<SalesLead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const fetchLeads = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('sales_leads')
        .select('*')
        .eq('partner_user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Fehler beim Laden der Leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, [user?.id]);

  const fetchActivities = async (leadId: string) => {
    const { data } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    setActivities(data || []);
  };

  const openLeadDetail = async (lead: SalesLead) => {
    setSelectedLead(lead);
    setNewNote('');
    await fetchActivities(lead.id);
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    if (!user?.id || !selectedLead) return;
    
    const oldStatus = selectedLead.status;
    try {
      await supabase
        .from('sales_leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      await supabase
        .from('lead_activities')
        .insert({
          lead_id: leadId,
          partner_user_id: user.id,
          activity_type: 'status_change',
          old_value: oldStatus,
          new_value: newStatus,
        });

      setSelectedLead({ ...selectedLead, status: newStatus });
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
      await fetchActivities(leadId);
      toast.success('Status aktualisiert');
    } catch (err) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const addNote = async () => {
    if (!user?.id || !selectedLead || !newNote.trim()) return;
    setSavingNote(true);
    try {
      await supabase
        .from('lead_activities')
        .insert({
          lead_id: selectedLead.id,
          partner_user_id: user.id,
          activity_type: 'note',
          note: newNote.trim(),
        });

      setNewNote('');
      await fetchActivities(selectedLead.id);
      toast.success('Notiz hinzugefügt');
    } catch (err) {
      toast.error('Fehler');
    } finally {
      setSavingNote(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = STATUS_OPTIONS.find(o => o.value === status);
    return <Badge className={s?.color || 'bg-gray-100 text-gray-600'}>{s?.label || status}</Badge>;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'status_change': return <Clock className="w-3.5 h-3.5 text-primary" />;
      case 'note': return <MessageSquare className="w-3.5 h-3.5 text-blue-500" />;
      default: return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getActivityText = (a: LeadActivity) => {
    if (a.activity_type === 'status_change') {
      const oldLabel = STATUS_OPTIONS.find(o => o.value === a.old_value)?.label || a.old_value;
      const newLabel = STATUS_OPTIONS.find(o => o.value === a.new_value)?.label || a.new_value;
      return `Status: ${oldLabel} → ${newLabel}`;
    }
    return a.note || '';
  };

  const filteredLeads = leads.filter(l => {
    const matchSearch = !searchTerm || 
      l.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.contact_person?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meine Leads</h1>
          <p className="text-sm text-muted-foreground">{filteredLeads.length} von {leads.length} Leads</p>
        </div>
        <Button onClick={() => navigate('/partner/leads/new')} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Neuer Lead
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lead list */}
      {filteredLeads.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Keine Leads gefunden</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filteredLeads.map((lead) => (
            <Card 
              key={lead.id} 
              className="cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => openLeadDetail(lead)}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{lead.shop_name}</p>
                      {getStatusBadge(lead.status)}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      {lead.contact_person && (
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{lead.contact_person}</span>
                      )}
                      {lead.city && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{lead.city}</span>
                      )}
                      {lead.phone && (
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>
                      )}
                      <span>{format(new Date(lead.created_at), 'dd.MM.yyyy', { locale: de })}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedLead.shop_name}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedLead.contact_person && (
                    <div><span className="text-muted-foreground">Kontakt:</span><p>{selectedLead.contact_person}</p></div>
                  )}
                  {selectedLead.phone && (
                    <div><span className="text-muted-foreground">Telefon:</span><p>{selectedLead.phone}</p></div>
                  )}
                  {selectedLead.email && (
                    <div><span className="text-muted-foreground">E-Mail:</span><p>{selectedLead.email}</p></div>
                  )}
                  {selectedLead.city && (
                    <div>
                      <span className="text-muted-foreground">Adresse:</span>
                      <p>{[selectedLead.street, selectedLead.house_number].filter(Boolean).join(' ')}</p>
                      <p>{[selectedLead.postal_code, selectedLead.city].filter(Boolean).join(' ')}</p>
                    </div>
                  )}
                </div>

                {/* Status buttons */}
                <div>
                  <p className="text-sm font-medium mb-2">Status ändern</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_OPTIONS.map(s => (
                      <Button
                        key={s.value}
                        variant={selectedLead.status === s.value ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs"
                        onClick={() => updateLeadStatus(selectedLead.id, s.value)}
                      >
                        {s.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Add note */}
                <div>
                  <p className="text-sm font-medium mb-2">Notiz hinzufügen</p>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="z.B. Telefonat geführt, interessiert an Plus-Paket..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={addNote}
                    disabled={savingNote || !newNote.trim()}
                  >
                    {savingNote ? 'Speichern...' : 'Notiz speichern'}
                  </Button>
                </div>

                {/* Activity timeline */}
                {activities.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Verlauf</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {activities.map((a) => (
                        <div key={a.id} className="flex items-start gap-2 text-xs">
                          <div className="mt-0.5">{getActivityIcon(a.activity_type)}</div>
                          <div className="flex-1">
                            <p className="text-foreground">{getActivityText(a)}</p>
                            <p className="text-muted-foreground">
                              {format(new Date(a.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedLead(null)}>Schließen</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

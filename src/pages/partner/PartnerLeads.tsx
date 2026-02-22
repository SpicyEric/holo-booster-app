import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Search, MapPin, Phone, User, Plus, MessageSquare, Clock,
  CalendarIcon, PhoneCall, Users as UsersIcon, ChevronRight,
  MoreHorizontal, Briefcase, Mail, AlertCircle,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

interface ScheduledActivity {
  id: string;
  lead_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  completed_at: string | null;
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'Neu', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'contacted', label: 'Kontaktiert', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'interested', label: 'Interessiert', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'offer_sent', label: 'Angebot gesendet', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'negotiating', label: 'Verhandlung', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'converted', label: 'Abgeschlossen', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'lost', label: 'Verloren', color: 'bg-gray-100 text-gray-600 border-gray-200' },
];

const INDUSTRY_OPTIONS = [
  'Café', 'Bäckerei', 'Metzgerei', 'Friseur', 'Imbiss', 'Restaurant',
  'Bar / Kneipe', 'Eisdiele', 'Tankstelle', 'Kiosk', 'Fitnessstudio',
  'Kosmetik / Nagelstudio', 'Blumenladen', 'Buchhandlung', 'Apotheke',
  'Handwerksbetrieb', 'Autowerkstatt', 'Waschsalon', 'Sonstiges',
];

const ACTIVITY_TYPES = [
  { value: 'call', label: 'Anruf', icon: PhoneCall },
  { value: 'meeting', label: 'Treffen', icon: UsersIcon },
  { value: 'follow_up', label: 'Follow-up', icon: Clock },
  { value: 'other', label: 'Sonstiges', icon: Briefcase },
];

export default function PartnerLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'pipeline'>('table');

  // Detail dialog
  const [selectedLead, setSelectedLead] = useState<SalesLead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [scheduledActivities, setScheduledActivities] = useState<ScheduledActivity[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // New lead dialog
  const [showNewLead, setShowNewLead] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    shop_name: '', contact_person: '', phone: '', email: '',
    street: '', house_number: '', postal_code: '', city: '',
    industry: '', priority: 'normal', notes: '',
  });

  // Schedule activity dialog
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleLeadId, setScheduleLeadId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    activity_type: 'call', title: '', description: '', scheduled_date: undefined as Date | undefined,
    scheduled_time: '10:00',
  });
  const [savingSchedule, setSavingSchedule] = useState(false);

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
    } catch {
      toast.error('Fehler beim Laden der Leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, [user?.id]);

  const fetchActivities = async (leadId: string) => {
    const [{ data: acts }, { data: scheduled }] = await Promise.all([
      supabase.from('lead_activities').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
      supabase.from('lead_scheduled_activities').select('*').eq('lead_id', leadId).order('scheduled_at', { ascending: true }),
    ]);
    setActivities(acts || []);
    setScheduledActivities(scheduled || []);
  };

  const openLeadDetail = async (lead: SalesLead) => {
    setSelectedLead(lead);
    setNewNote('');
    await fetchActivities(lead.id);
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    if (!user?.id) return;
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    try {
      await supabase.from('sales_leads').update({ status: newStatus }).eq('id', leadId);
      await supabase.from('lead_activities').insert({
        lead_id: leadId, partner_user_id: user.id, activity_type: 'status_change',
        old_value: lead.status, new_value: newStatus,
      });
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, status: newStatus });
        await fetchActivities(leadId);
      }
      toast.success('Status aktualisiert');
    } catch {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const addNote = async () => {
    if (!user?.id || !selectedLead || !newNote.trim()) return;
    setSavingNote(true);
    try {
      await supabase.from('lead_activities').insert({
        lead_id: selectedLead.id, partner_user_id: user.id, activity_type: 'note', note: newNote.trim(),
      });
      setNewNote('');
      await fetchActivities(selectedLead.id);
      toast.success('Notiz hinzugefügt');
    } catch {
      toast.error('Fehler');
    } finally {
      setSavingNote(false);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !newLeadForm.shop_name.trim()) { toast.error('Shopname ist erforderlich'); return; }
    setSavingLead(true);
    try {
      const { error } = await supabase.from('sales_leads').insert({
        partner_user_id: user.id, shop_name: newLeadForm.shop_name.trim(),
        contact_person: newLeadForm.contact_person || null, phone: newLeadForm.phone || null,
        email: newLeadForm.email || null, street: newLeadForm.street || null,
        house_number: newLeadForm.house_number || null, postal_code: newLeadForm.postal_code || null,
        city: newLeadForm.city || null, industry: newLeadForm.industry || null,
        priority: newLeadForm.priority, notes: newLeadForm.notes || null, status: 'new',
      });
      if (error) throw error;
      toast.success('Lead erstellt!');
      setShowNewLead(false);
      setNewLeadForm({ shop_name: '', contact_person: '', phone: '', email: '', street: '', house_number: '', postal_code: '', city: '', industry: '', priority: 'normal', notes: '' });
      fetchLeads();
    } catch {
      toast.error('Fehler beim Erstellen');
    } finally {
      setSavingLead(false);
    }
  };

  const openScheduleDialog = (leadId: string) => {
    setScheduleLeadId(leadId);
    setScheduleForm({ activity_type: 'call', title: '', description: '', scheduled_date: undefined, scheduled_time: '10:00' });
    setShowSchedule(true);
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !scheduleLeadId || !scheduleForm.title.trim() || !scheduleForm.scheduled_date) {
      toast.error('Titel und Datum sind erforderlich');
      return;
    }
    setSavingSchedule(true);
    try {
      const [h, m] = scheduleForm.scheduled_time.split(':').map(Number);
      const scheduledAt = new Date(scheduleForm.scheduled_date);
      scheduledAt.setHours(h, m, 0, 0);

      const { error } = await supabase.from('lead_scheduled_activities').insert({
        lead_id: scheduleLeadId, partner_user_id: user.id,
        activity_type: scheduleForm.activity_type, title: scheduleForm.title.trim(),
        description: scheduleForm.description || null, scheduled_at: scheduledAt.toISOString(),
      });
      if (error) throw error;
      toast.success('Aktivität geplant!');
      setShowSchedule(false);
      if (selectedLead?.id === scheduleLeadId) await fetchActivities(scheduleLeadId);
    } catch {
      toast.error('Fehler beim Planen');
    } finally {
      setSavingSchedule(false);
    }
  };

  const completeActivity = async (activityId: string) => {
    try {
      await supabase.from('lead_scheduled_activities').update({ completed_at: new Date().toISOString() }).eq('id', activityId);
      if (selectedLead) await fetchActivities(selectedLead.id);
      toast.success('Aktivität abgeschlossen');
    } catch {
      toast.error('Fehler');
    }
  };

  const getStatusBadge = (status: string) => {
    const s = STATUS_OPTIONS.find(o => o.value === status);
    return <Badge className={cn('border', s?.color || 'bg-gray-100 text-gray-600')}>{s?.label || status}</Badge>;
  };

  const filteredLeads = useMemo(() => leads.filter(l => {
    const matchSearch = !searchTerm ||
      l.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.industry?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    const matchIndustry = industryFilter === 'all' || l.industry === industryFilter;
    const matchPriority = priorityFilter === 'all' || l.priority === priorityFilter;
    return matchSearch && matchStatus && matchIndustry && matchPriority;
  }), [leads, searchTerm, statusFilter, industryFilter, priorityFilter]);

  const pipelineGroups = useMemo(() => {
    const groups: Record<string, SalesLead[]> = {};
    STATUS_OPTIONS.forEach(s => { groups[s.value] = []; });
    filteredLeads.forEach(l => { if (groups[l.status]) groups[l.status].push(l); });
    return groups;
  }, [filteredLeads]);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meine Leads</h1>
          <p className="text-sm text-muted-foreground">{filteredLeads.length} von {leads.length} Leads</p>
        </div>
        <Button onClick={() => setShowNewLead(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Neuer Lead
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Suchen..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Branche" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Branchen</SelectItem>
            {INDUSTRY_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Priorität" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="high">Hoch</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Niedrig</SelectItem>
          </SelectContent>
        </Select>
        <Tabs value={viewMode} onValueChange={v => setViewMode(v as any)} className="ml-auto">
          <TabsList className="h-9">
            <TabsTrigger value="table" className="text-xs px-3">Liste</TabsTrigger>
            <TabsTrigger value="pipeline" className="text-xs px-3">Pipeline</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        filteredLeads.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Keine Leads gefunden
          </CardContent></Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop</TableHead>
                  <TableHead className="hidden md:table-cell">Kontakt</TableHead>
                  <TableHead className="hidden md:table-cell">Branche</TableHead>
                  <TableHead className="hidden lg:table-cell">Stadt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Erstellt</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map(lead => (
                  <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openLeadDetail(lead)}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{lead.shop_name}</p>
                        {lead.priority === 'high' && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Hoch</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{lead.contact_person || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{lead.industry || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{lead.city || '—'}</TableCell>
                    <TableCell>{getStatusBadge(lead.status)}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{format(new Date(lead.created_at), 'dd.MM.yy', { locale: de })}</TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openScheduleDialog(lead.id)} title="Aktivität planen">
                          <CalendarIcon className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background">
                            {STATUS_OPTIONS.filter(s => s.value !== lead.status).map(s => (
                              <DropdownMenuItem key={s.value} onClick={() => updateLeadStatus(lead.id, s.value)}>
                                → {s.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )
      )}

      {/* Pipeline View */}
      {viewMode === 'pipeline' && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STATUS_OPTIONS.filter(s => s.value !== 'lost').map(status => (
            <div key={status.value} className="min-w-[250px] flex-shrink-0">
              <div className={cn('rounded-t-lg px-3 py-2 text-xs font-semibold border', status.color)}>
                {status.label} ({pipelineGroups[status.value]?.length || 0})
              </div>
              <div className="space-y-2 bg-muted/30 rounded-b-lg p-2 min-h-[200px]">
                {(pipelineGroups[status.value] || []).map(lead => (
                  <Card key={lead.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openLeadDetail(lead)}>
                    <CardContent className="p-3">
                      <p className="font-medium text-sm truncate">{lead.shop_name}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {lead.contact_person && <span className="flex items-center gap-1"><User className="w-3 h-3" />{lead.contact_person}</span>}
                        {lead.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{lead.city}</span>}
                      </div>
                      {lead.industry && <Badge variant="outline" className="mt-1.5 text-[10px]">{lead.industry}</Badge>}
                      <div className="flex justify-between mt-2">
                        <span className="text-[10px] text-muted-foreground">{format(new Date(lead.created_at), 'dd.MM.yy', { locale: de })}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); openScheduleDialog(lead.id); }}>
                          <CalendarIcon className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedLead.shop_name}
                  {selectedLead.industry && <Badge variant="outline" className="text-xs font-normal">{selectedLead.industry}</Badge>}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Contact info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedLead.contact_person && <div><span className="text-muted-foreground text-xs">Kontakt</span><p className="flex items-center gap-1"><User className="w-3 h-3" />{selectedLead.contact_person}</p></div>}
                  {selectedLead.phone && <div><span className="text-muted-foreground text-xs">Telefon</span><p className="flex items-center gap-1"><Phone className="w-3 h-3" /><a href={`tel:${selectedLead.phone}`} className="text-primary hover:underline">{selectedLead.phone}</a></p></div>}
                  {selectedLead.email && <div><span className="text-muted-foreground text-xs">E-Mail</span><p className="flex items-center gap-1"><Mail className="w-3 h-3" /><a href={`mailto:${selectedLead.email}`} className="text-primary hover:underline">{selectedLead.email}</a></p></div>}
                  {selectedLead.city && <div><span className="text-muted-foreground text-xs">Adresse</span><p className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[selectedLead.street, selectedLead.house_number].filter(Boolean).join(' ')}, {[selectedLead.postal_code, selectedLead.city].filter(Boolean).join(' ')}</p></div>}
                </div>

                {/* Quick status change */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_OPTIONS.map(s => (
                      <Button key={s.value} variant={selectedLead.status === s.value ? 'default' : 'outline'} size="sm" className="text-xs h-7"
                        onClick={() => updateLeadStatus(selectedLead.id, s.value)}>{s.label}</Button>
                    ))}
                  </div>
                </div>

                {/* Scheduled activities */}
                {scheduledActivities.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Geplante Aktivitäten</p>
                    <div className="space-y-1.5">
                      {scheduledActivities.map(a => {
                        const isPast = new Date(a.scheduled_at) < new Date() && !a.completed_at;
                        return (
                          <div key={a.id} className={cn('flex items-center gap-2 text-xs p-2 rounded-lg border', a.completed_at ? 'bg-muted/50 line-through opacity-60' : isPast ? 'bg-red-50 border-red-200' : 'bg-muted/30')}>
                            <CalendarIcon className={cn('w-3.5 h-3.5', isPast ? 'text-red-500' : 'text-primary')} />
                            <div className="flex-1">
                              <p className="font-medium">{a.title}</p>
                              <p className="text-muted-foreground">{format(new Date(a.scheduled_at), 'dd.MM.yy HH:mm', { locale: de })}</p>
                            </div>
                            {!a.completed_at && (
                              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => completeActivity(a.id)}>✓</Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Button variant="outline" size="sm" className="w-full" onClick={() => openScheduleDialog(selectedLead.id)}>
                  <CalendarIcon className="w-4 h-4 mr-1" /> Aktivität planen
                </Button>

                {/* Add note */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Notiz hinzufügen</p>
                  <Textarea placeholder="z.B. Telefonat geführt..." value={newNote} onChange={e => setNewNote(e.target.value)} rows={2} className="text-sm" />
                  <Button size="sm" className="mt-2" onClick={addNote} disabled={savingNote || !newNote.trim()}>
                    {savingNote ? 'Speichern...' : 'Notiz speichern'}
                  </Button>
                </div>

                {/* Activity timeline */}
                {activities.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Verlauf</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {activities.map(a => (
                        <div key={a.id} className="flex items-start gap-2 text-xs">
                          <div className="mt-0.5">
                            {a.activity_type === 'status_change' ? <Clock className="w-3.5 h-3.5 text-primary" /> : <MessageSquare className="w-3.5 h-3.5 text-blue-500" />}
                          </div>
                          <div className="flex-1">
                            <p>{a.activity_type === 'status_change'
                              ? `Status: ${STATUS_OPTIONS.find(o => o.value === a.old_value)?.label || a.old_value} → ${STATUS_OPTIONS.find(o => o.value === a.new_value)?.label || a.new_value}`
                              : a.note || ''}</p>
                            <p className="text-muted-foreground">{format(new Date(a.created_at), 'dd.MM.yy HH:mm', { locale: de })}</p>
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

      {/* New Lead Dialog */}
      <Dialog open={showNewLead} onOpenChange={setShowNewLead}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Neuen Lead erstellen</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateLead} className="space-y-4">
            <div><Label>Shopname *</Label><Input value={newLeadForm.shop_name} onChange={e => setNewLeadForm(p => ({ ...p, shop_name: e.target.value }))} placeholder="z.B. Café Milano" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Ansprechpartner</Label><Input value={newLeadForm.contact_person} onChange={e => setNewLeadForm(p => ({ ...p, contact_person: e.target.value }))} /></div>
              <div><Label>Telefon</Label><Input value={newLeadForm.phone} onChange={e => setNewLeadForm(p => ({ ...p, phone: e.target.value }))} /></div>
            </div>
            <div><Label>E-Mail</Label><Input type="email" value={newLeadForm.email} onChange={e => setNewLeadForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2"><Label>Straße</Label><Input value={newLeadForm.street} onChange={e => setNewLeadForm(p => ({ ...p, street: e.target.value }))} /></div>
              <div><Label>Hausnr.</Label><Input value={newLeadForm.house_number} onChange={e => setNewLeadForm(p => ({ ...p, house_number: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>PLZ</Label><Input value={newLeadForm.postal_code} onChange={e => setNewLeadForm(p => ({ ...p, postal_code: e.target.value }))} /></div>
              <div><Label>Stadt</Label><Input value={newLeadForm.city} onChange={e => setNewLeadForm(p => ({ ...p, city: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Branche</Label>
                <Select value={newLeadForm.industry} onValueChange={v => setNewLeadForm(p => ({ ...p, industry: v }))}>
                  <SelectTrigger><SelectValue placeholder="Branche wählen" /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priorität</Label>
                <Select value={newLeadForm.priority} onValueChange={v => setNewLeadForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Niedrig</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notizen</Label><Textarea value={newLeadForm.notes} onChange={e => setNewLeadForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewLead(false)}>Abbrechen</Button>
              <Button type="submit" disabled={savingLead}>{savingLead ? 'Erstellen...' : 'Lead erstellen'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Schedule Activity Dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Aktivität planen</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateSchedule} className="space-y-4">
            <div>
              <Label>Typ</Label>
              <Select value={scheduleForm.activity_type} onValueChange={v => setScheduleForm(p => ({ ...p, activity_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Titel *</Label><Input value={scheduleForm.title} onChange={e => setScheduleForm(p => ({ ...p, title: e.target.value }))} placeholder="z.B. Erstgespräch führen" /></div>
            <div>
              <Label>Datum *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !scheduleForm.scheduled_date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduleForm.scheduled_date ? format(scheduleForm.scheduled_date, 'dd.MM.yyyy', { locale: de }) : 'Datum wählen'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={scheduleForm.scheduled_date} onSelect={d => setScheduleForm(p => ({ ...p, scheduled_date: d }))} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div><Label>Uhrzeit</Label><Input type="time" value={scheduleForm.scheduled_time} onChange={e => setScheduleForm(p => ({ ...p, scheduled_time: e.target.value }))} /></div>
            <div><Label>Beschreibung</Label><Textarea value={scheduleForm.description} onChange={e => setScheduleForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowSchedule(false)}>Abbrechen</Button>
              <Button type="submit" disabled={savingSchedule}>{savingSchedule ? 'Planen...' : 'Aktivität planen'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

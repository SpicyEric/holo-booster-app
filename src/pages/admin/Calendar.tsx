import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, Plus, Loader2, Clock, Trash2, CalendarDays, MapPin, X, Navigation, Phone, Link2, Unlink,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  lead_id: string;
  title: string;
  description: string | null;
  address: string | null;
  scheduled_at: string;
  duration_minutes: number;
  created_at: string;
  lead?: {
    id: string;
    name: string;
    google_photo_url: string | null;
    status: string;
    note_title: string | null;
    notes: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    contact_person: string | null;
    latitude: number | null;
    longitude: number | null;
  };
}

interface PreSelectedLead {
  id: string;
  name: string;
  google_photo_url: string | null;
  address: string | null;
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const DURATION_OPTIONS = [15, 30, 60];

export default function AdminCalendar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Pre-selected lead from pipeline
  const [preSelectedLead, setPreSelectedLead] = useState<PreSelectedLead | null>(null);

  // Google Calendar connection
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalLoading, setGcalLoading] = useState(false);

  // New appointment dialog
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newTime, setNewTime] = useState('10:00');
  const [newDuration, setNewDuration] = useState(60);
  const [newDate, setNewDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Check Google Calendar connection status
  const checkGcalStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'status' },
      });

      if (!error && data) {
        setGcalConnected(data.connected);
      }
    } catch (err) {
      console.error('GCal status check failed:', err);
    }
  }, []);

  useEffect(() => { checkGcalStatus(); }, [checkGcalStatus]);

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (!code) return;

    (async () => {
      setGcalLoading(true);
      try {
        const redirectUri = `${window.location.origin}/admin/calendar`;
        const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
          body: { action: 'exchange_code', code, redirect_uri: redirectUri },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        setGcalConnected(true);
        toast.success('Google Calendar verbunden!');
      } catch (err: any) {
        toast.error('Verbindung fehlgeschlagen: ' + (err.message || 'Fehler'));
      } finally {
        setGcalLoading(false);
        // Remove code/state from URL
        searchParams.delete('code');
        searchParams.delete('state');
        searchParams.delete('scope');
        setSearchParams(searchParams, { replace: true });
      }
    })();
  }, [searchParams]);

  const connectGoogleCalendar = async () => {
    setGcalLoading(true);
    try {
      const redirectUri = `${window.location.origin}/admin/calendar`;
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'get_auth_url', redirect_uri: redirectUri },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error('Fehler: ' + (err.message || 'Unbekannt'));
      setGcalLoading(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    setGcalLoading(true);
    try {
      await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'disconnect' },
      });
      setGcalConnected(false);
      toast.success('Google Calendar getrennt');
    } catch (err: any) {
      toast.error('Fehler beim Trennen');
    } finally {
      setGcalLoading(false);
    }
  };

  // Sync appointment to Google Calendar
  const syncToGoogleCalendar = async (appointmentData: any) => {
    if (!gcalConnected) return;
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'create', appointment: appointmentData },
      });
      if (error) throw error;
      if (data?.error === 'not_connected') {
        setGcalConnected(false);
        return;
      }
      if (data?.success) {
        console.log('Synced to Google Calendar:', data.google_event_id);
      }
    } catch (err) {
      console.error('GCal sync failed:', err);
    }
  };

  const deleteFromGoogleCalendar = async (appointment: Appointment) => {
    if (!gcalConnected) return;
    try {
      await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'delete', appointment: { google_calendar_event_id: (appointment as any).google_calendar_event_id } },
      });
    } catch (err) {
      console.error('GCal delete failed:', err);
    }
  };

  // Load pre-selected lead from URL
  useEffect(() => {
    const leadId = searchParams.get('leadId');
    if (!leadId) {
      setPreSelectedLead(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('discovered_stores')
        .select('id, name, google_photo_url, address')
        .eq('id', leadId)
        .single();
      if (data) {
        setPreSelectedLead(data as PreSelectedLead);
      }
    })();
  }, [searchParams]);

  const clearPreSelectedLead = () => {
    setPreSelectedLead(null);
    searchParams.delete('leadId');
    setSearchParams(searchParams, { replace: true });
  };

  const fetchAppointments = useCallback(async () => {
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      const { data, error } = await supabase
        .from('pipeline_appointments')
        .select('*')
        .gte('scheduled_at', start.toISOString())
        .lte('scheduled_at', end.toISOString())
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      const leadIds = [...new Set((data || []).map((a: any) => a.lead_id))];
      let leadsMap: Record<string, any> = {};
      if (leadIds.length > 0) {
        const { data: leads } = await supabase
          .from('discovered_stores')
          .select('id, name, google_photo_url, status, note_title, notes, phone, email, address, contact_person, latitude, longitude')
          .in('id', leadIds);
        if (leads) {
          leadsMap = Object.fromEntries(leads.map((l: any) => [l.id, l]));
        }
      }

      setAppointments(
        (data || []).map((a: any) => ({ ...a, lead: leadsMap[a.lead_id] || null }))
      );
    } catch (err) {
      console.error(err);
      toast.error('Fehler beim Laden der Termine');
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const appointmentsByDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      const key = format(parseISO(a.scheduled_at), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    return map;
  }, [appointments]);

  const openNewDialog = (dateStr: string) => {
    setNewDate(dateStr);
    setNewTime('10:00');
    setNewDuration(60);
    setNewNotes('');
    if (preSelectedLead) {
      setNewTitle(`Termin mit ${preSelectedLead.name}`);
      setNewAddress(preSelectedLead.address || '');
    } else {
      setNewTitle('');
      setNewAddress('');
    }
    setNewDialogOpen(true);
  };

  const handleCreateAppointment = async () => {
    if (!newTitle.trim() || !newDate) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht eingeloggt');

      const scheduledAt = new Date(`${newDate}T${newTime}:00`);

      const leadId = preSelectedLead?.id || '00000000-0000-0000-0000-000000000000';

      const { error } = await supabase.from('pipeline_appointments').insert({
        title: newTitle.trim(),
        description: newNotes.trim() || null,
        address: newAddress.trim() || null,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: newDuration,
        created_by_user_id: user.id,
        lead_id: leadId,
      } as any);

      if (error) throw error;
      toast.success('Termin erstellt');
      setNewDialogOpen(false);
      setNewTitle('');
      setNewNotes('');
      setNewAddress('');
      clearPreSelectedLead();
      fetchAppointments();
    } catch (err: any) {
      toast.error(err.message || 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  const deleteAppointment = async (id: string) => {
    const { error } = await supabase.from('pipeline_appointments').delete().eq('id', id);
    if (error) {
      toast.error('Fehler beim Löschen');
    } else {
      toast.success('Termin gelöscht');
      setSelectedAppointment(null);
      fetchAppointments();
    }
  };

  const navigateToStoreOnMap = (appointment: Appointment) => {
    const lead = appointment.lead;
    if (lead?.latitude && lead?.longitude) {
      navigate(`/admin/store-finder?lat=${lead.latitude}&lng=${lead.longitude}&name=${encodeURIComponent(lead.name)}`);
    } else if (appointment.address || lead?.address) {
      navigate(`/admin/store-finder?address=${encodeURIComponent(appointment.address || lead?.address || '')}`);
    }
  };

  const dayAppointments = selectedDate
    ? appointmentsByDay[format(selectedDate, 'yyyy-MM-dd')] || []
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pre-selected lead banner */}
      {preSelectedLead && (
        <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
          {preSelectedLead.google_photo_url ? (
            <img src={preSelectedLead.google_photo_url} alt="" className="h-9 w-9 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{preSelectedLead.name}</p>
            <p className="text-xs text-muted-foreground">Vorgemerkt – wähle einen Tag, um einen Termin zu erstellen</p>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7" onClick={clearPreSelectedLead}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kalender</h1>
          <p className="text-muted-foreground text-sm">Termine und Wiedervorlagen</p>
        </div>
        <Button onClick={() => openNewDialog(format(new Date(), 'yyyy-MM-dd'))}>
          <Plus className="h-4 w-4 mr-1" /> Neuer Termin
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-card border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold">
              {format(currentMonth, 'MMMM yyyy', { locale: de })}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayAppts = appointmentsByDay[key] || [];
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'relative min-h-[80px] p-1.5 rounded-lg border text-left transition-all',
                    isCurrentMonth ? 'bg-background' : 'bg-muted/30 opacity-50',
                    isSelected && 'ring-2 ring-primary border-primary',
                    isToday && !isSelected && 'border-primary/50',
                    'hover:bg-accent/50'
                  )}
                >
                  <span className={cn(
                    'text-xs font-medium',
                    isToday && 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center',
                    !isToday && 'text-foreground'
                  )}>
                    {format(day, 'd')}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayAppts.slice(0, 3).map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-1 bg-primary/10 rounded px-1 py-0.5 cursor-pointer hover:bg-primary/20"
                        onClick={(e) => { e.stopPropagation(); setSelectedAppointment(a); }}
                      >
                        {a.lead?.google_photo_url ? (
                          <img src={a.lead.google_photo_url} alt="" className="h-3.5 w-3.5 rounded-full object-cover shrink-0" />
                        ) : (
                          <CalendarDays className="h-3 w-3 shrink-0 text-primary" />
                        )}
                        <span className="text-[9px] truncate font-medium">{a.title}</span>
                      </div>
                    ))}
                    {dayAppts.length > 3 && (
                      <span className="text-[9px] text-muted-foreground px-1">+{dayAppts.length - 3} weitere</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day detail sidebar - Timeline */}
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-sm">
            {selectedDate
              ? format(selectedDate, 'EEEE, d. MMMM yyyy', { locale: de })
              : 'Tag auswählen'}
          </h3>

          {selectedDate && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => openNewDialog(format(selectedDate, 'yyyy-MM-dd'))}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Termin hinzufügen
            </Button>
          )}

          {selectedDate ? (
            (() => {
              // Dynamic timeline range based on appointments
              const defaultStart = 8;
              const defaultEnd = 20;
              let timelineStart = defaultStart;
              let timelineEnd = defaultEnd;

              if (dayAppointments.length > 0) {
                const earliestHour = Math.min(...dayAppointments.map(a => parseISO(a.scheduled_at).getHours()));
                const latestEnd = Math.max(...dayAppointments.map(a => {
                  const d = parseISO(a.scheduled_at);
                  return d.getHours() + Math.ceil((d.getMinutes() + (a.duration_minutes || 60)) / 60);
                }));
                timelineStart = Math.min(defaultStart, earliestHour);
                timelineEnd = Math.max(defaultEnd, latestEnd);
              }

              const totalSlots = (timelineEnd - timelineStart) * 2 + 1;

              return (
                <div className="h-[500px] overflow-y-auto overscroll-contain" style={{ scrollbarWidth: 'none' }}>
                  <style>{`.timeline-scroll::-webkit-scrollbar { display: none; }`}</style>
                  <div className="relative timeline-scroll">
                    {Array.from({ length: totalSlots }, (_, i) => {
                      const hour = Math.floor(i / 2) + timelineStart;
                      const minute = (i % 2) * 30;
                      const timeLabel = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                      const isFullHour = minute === 0;

                      return (
                        <div
                          key={i}
                          className={cn(
                            'relative h-[40px] flex items-start',
                            isFullHour ? 'border-t border-border' : 'border-t border-border/30'
                          )}
                        >
                          <span className={cn(
                            'text-[10px] w-10 shrink-0 -mt-[7px] select-none',
                            isFullHour ? 'text-muted-foreground font-medium' : 'text-muted-foreground/50'
                          )}>
                            {timeLabel}
                          </span>
                          <div className="flex-1 relative" />
                        </div>
                      );
                    })}

                    {dayAppointments.map((a) => {
                      const apptDate = parseISO(a.scheduled_at);
                      const apptHour = apptDate.getHours();
                      const apptMinute = apptDate.getMinutes();
                      const startSlot = (apptHour - timelineStart) * 2 + apptMinute / 30;
                      const durationSlots = (a.duration_minutes || 60) / 30;
                      const topPx = startSlot * 40;
                      const heightPx = Math.max(durationSlots * 40 - 2, 28);

                      return (
                        <div
                          key={a.id}
                          className="absolute left-10 right-0 bg-primary/10 border border-primary/20 rounded-lg px-2 py-1 cursor-pointer hover:bg-primary/20 transition-colors overflow-hidden z-10"
                          style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                          onClick={() => setSelectedAppointment(a)}
                        >
                          <div className="flex items-center gap-1.5">
                            {a.lead?.google_photo_url ? (
                              <img src={a.lead.google_photo_url} alt="" className="h-5 w-5 rounded object-cover shrink-0" />
                            ) : (
                              <CalendarDays className="h-3.5 w-3.5 text-primary shrink-0" />
                            )}
                            <span className="text-[11px] font-medium truncate">{a.title}</span>
                          </div>
                          {heightPx > 36 && (
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                              {format(apptDate, 'HH:mm')} – {format(new Date(apptDate.getTime() + (a.duration_minutes || 60) * 60000), 'HH:mm')} Uhr
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">Tag auswählen, um den Zeitstrahl zu sehen</p>
          )}
        </div>
      </div>

      {/* Appointment detail dialog */}
      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedAppointment?.lead?.google_photo_url ? (
                <img src={selectedAppointment.lead.google_photo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
              )}
              <div>
                <p>{selectedAppointment?.title}</p>
                {selectedAppointment?.lead && (
                  <p className="text-sm font-normal text-muted-foreground">{selectedAppointment.lead.name}</p>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {format(parseISO(selectedAppointment.scheduled_at), "EEEE, d. MMMM yyyy 'um' HH:mm 'Uhr'", { locale: de })}
                  {' · '}{selectedAppointment.duration_minutes} Min.
                </span>
              </div>

              {/* Address with navigation */}
              {(selectedAppointment.address || selectedAppointment.lead?.address) && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-muted-foreground">{selectedAppointment.address || selectedAppointment.lead?.address}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => navigateToStoreOnMap(selectedAppointment)}
                    title="Auf Karte anzeigen"
                  >
                    <Navigation className="h-3.5 w-3.5 text-primary" />
                  </Button>
                </div>
              )}

              {/* Phone number */}
              {selectedAppointment.lead?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`tel:${selectedAppointment.lead.phone}`} className="text-muted-foreground hover:text-foreground transition-colors">
                    {selectedAppointment.lead.phone}
                  </a>
                </div>
              )}

              {selectedAppointment.description && (
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <p className="text-xs font-medium">Notizen</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedAppointment.description}</p>
                </div>
              )}
              {selectedAppointment.lead?.note_title && (
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <p className="text-xs font-medium">Notiztitel</p>
                  <p className="text-sm">{selectedAppointment.lead.note_title}</p>
                </div>
              )}
              {selectedAppointment.lead?.notes && (
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <p className="text-xs font-medium">Lead-Notizen</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedAppointment.lead.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="destructive" size="sm" onClick={() => selectedAppointment && deleteAppointment(selectedAppointment.id)}>
              <Trash2 className="h-4 w-4 mr-1" /> Löschen
            </Button>
            <Button variant="outline" onClick={() => setSelectedAppointment(null)}>Schließen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New appointment dialog */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Neuer Termin</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Show pre-selected lead info */}
            {preSelectedLead && (
              <div className="flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
                {preSelectedLead.google_photo_url ? (
                  <img src={preSelectedLead.google_photo_url} alt="" className="h-7 w-7 rounded-md object-cover shrink-0" />
                ) : (
                  <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <span className="text-xs font-medium truncate">{preSelectedLead.name}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Titel</label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Termin mit..." autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Datum</label>
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Uhrzeit</label>
                <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Dauer</label>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setNewDuration(d)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      newDuration === d
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                    )}
                  >
                    {d} Min.
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Adresse</label>
              <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="Straße, PLZ Ort..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Notizen</label>
              <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={2} placeholder="Optional..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleCreateAppointment} disabled={!newTitle.trim() || !newDate || saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

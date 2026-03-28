import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, Plus, Loader2, Clock, Trash2, X, CalendarDays,
} from 'lucide-react';
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
  };
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function AdminCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // New appointment dialog
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTime, setNewTime] = useState('10:00');
  const [newDuration, setNewDuration] = useState(60);
  const [newDate, setNewDate] = useState('');
  const [saving, setSaving] = useState(false);

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

      // Fetch lead details for each appointment
      const leadIds = [...new Set((data || []).map((a: any) => a.lead_id))];
      let leadsMap: Record<string, any> = {};
      if (leadIds.length > 0) {
        const { data: leads } = await supabase
          .from('discovered_stores')
          .select('id, name, google_photo_url, status, note_title, notes, phone, email, address, contact_person')
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

  const handleCreateAppointment = async () => {
    if (!newTitle.trim() || !newDate) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht eingeloggt');

      const scheduledAt = new Date(`${newDate}T${newTime}:00`);

      const { error } = await supabase.from('pipeline_appointments').insert({
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: newDuration,
        created_by_user_id: user.id,
        lead_id: '00000000-0000-0000-0000-000000000000', // placeholder, will be linked from pipeline
      } as any);

      if (error) throw error;
      toast.success('Termin erstellt');
      setNewDialogOpen(false);
      setNewTitle('');
      setNewDescription('');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kalender</h1>
          <p className="text-muted-foreground text-sm">Termine und Wiedervorlagen</p>
        </div>
        <Button onClick={() => {
          setNewDate(format(new Date(), 'yyyy-MM-dd'));
          setNewDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-1" /> Neuer Termin
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-card border rounded-xl p-4">
          {/* Month navigation */}
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

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Days */}
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

        {/* Day detail sidebar */}
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
              onClick={() => {
                setNewDate(format(selectedDate, 'yyyy-MM-dd'));
                setNewDialogOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Termin hinzufügen
            </Button>
          )}

          {dayAppointments.length === 0 && selectedDate && (
            <p className="text-xs text-muted-foreground text-center py-4">Keine Termine</p>
          )}

          <div className="space-y-2">
            {dayAppointments.map((a) => (
              <div
                key={a.id}
                onClick={() => setSelectedAppointment(a)}
                className="p-3 border rounded-lg hover:shadow-sm transition-shadow cursor-pointer space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  {a.lead?.google_photo_url ? (
                    <img src={a.lead.google_photo_url} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <CalendarDays className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{a.title}</p>
                    {a.lead && <p className="text-[11px] text-muted-foreground truncate">{a.lead.name}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{format(parseISO(a.scheduled_at), 'HH:mm')} Uhr · {a.duration_minutes} Min.</span>
                </div>
              </div>
            ))}
          </div>
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
              {selectedAppointment.description && (
                <p className="text-muted-foreground">{selectedAppointment.description}</p>
              )}
              {selectedAppointment.lead?.note_title && (
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <p className="text-xs font-medium">Notiztitel</p>
                  <p className="text-sm">{selectedAppointment.lead.note_title}</p>
                </div>
              )}
              {selectedAppointment.lead?.notes && (
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <p className="text-xs font-medium">Notizen</p>
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
              <label className="text-xs font-medium">Dauer (Minuten)</label>
              <Input type="number" value={newDuration} onChange={(e) => setNewDuration(Number(e.target.value))} min={15} step={15} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Beschreibung</label>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={2} placeholder="Optional..." />
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

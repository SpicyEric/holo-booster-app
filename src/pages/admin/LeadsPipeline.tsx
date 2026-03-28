import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Plus, Star, User, MapPin, Phone, Mail, Globe, MessageSquare,
  Trash2, X, Search, Loader2, ExternalLink, CalendarPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DiscoveredStore {
  id: string;
  name: string;
  address: string | null;
  street: string | null;
  house_number: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  google_rating: number | null;
  google_reviews_count: number | null;
  google_photo_url: string | null;
  industry: string | null;
  contact_person: string | null;
  ai_summary: string | null;
  enrichment_status: string;
  notes: string | null;
  note_title: string | null;
  status: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
}

/* ------------------------------------------------------------------ */
/*  Pipeline stages                                                    */
/* ------------------------------------------------------------------ */

const STAGES = [
  { key: 'neu', label: 'Neu', bgColor: 'hsl(262, 40%, 82%)' },
  { key: 'angerufen', label: 'Angerufen', bgColor: 'hsl(262, 45%, 72%)' },
  { key: 'terminiert', label: 'Terminiert', bgColor: 'hsl(262, 48%, 62%)' },
  { key: 'besucht', label: 'Besucht', bgColor: 'hsl(262, 50%, 52%)' },
  { key: 'gewonnen', label: 'Gewonnen', bgColor: 'hsl(262, 55%, 45%)' },
  { key: 'verloren', label: 'Verloren', bgColor: 'hsl(0, 0%, 25%)' },
  { key: 'standby', label: 'Standby', bgColor: 'hsl(262, 15%, 55%)' },
] as const;

const ARCHIVE_STAGES = ['gewonnen', 'verloren', 'standby'] as const;

/* ------------------------------------------------------------------ */
/*  Helper: map old statuses to pipeline stage                         */
/* ------------------------------------------------------------------ */
function mapStatus(s: string): string {
  if (s === 'new' || s === 'kontaktaufnahme') return 'neu';
  if (s === 'telefonanruf') return 'angerufen';
  if (s === 'vor_ort_besuch') return 'besucht';
  if (s === 'produktbesprechung' || s === 'in_verhandlung') return 'terminiert';
  if (STAGES.some(st => st.key === s)) return s;
  return 'neu';
}

/* ------------------------------------------------------------------ */
/*  Stars                                                              */
/* ------------------------------------------------------------------ */
function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'h-3 w-3',
            i < full
              ? 'fill-amber-400 text-amber-400'
              : i === full && half
              ? 'fill-amber-400/50 text-amber-400'
              : 'text-muted-foreground/30'
          )}
        />
      ))}
      <span className="text-[11px] text-muted-foreground ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Deal card                                                          */
/* ------------------------------------------------------------------ */
function DealCard({
  store,
  onDragStart,
  onClick,
  onNoteTitleSave,
  onSchedule,
}: {
  store: DiscoveredStore;
  onDragStart: (e: React.DragEvent) => void;
  onClick: () => void;
  onNoteTitleSave: (id: string, value: string) => void;
  onSchedule: (store: DiscoveredStore) => void;
}) {
  const [editingNoteTitle, setEditingNoteTitle] = useState(false);
  const [localNoteTitle, setLocalNoteTitle] = useState(store.note_title || '');
  const shortAddr = [store.street, store.house_number].filter(Boolean).join(' ');
  const cityLine = [store.postal_code, store.city].filter(Boolean).join(' ');

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="bg-card border border-border/60 rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow space-y-2 select-none"
    >
      {/* Header */}
      <div className="flex items-start gap-2.5">
        {store.google_photo_url ? (
          <img
            src={store.google_photo_url}
            alt=""
            className="h-10 w-10 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">
              {store.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm leading-tight truncate">{store.name}</p>
          {store.industry && (
            <Badge variant="secondary" className="text-[10px] mt-0.5 h-4">{store.industry}</Badge>
          )}
        </div>
        {/* Schedule button */}
        <button
          onClick={(e) => { e.stopPropagation(); onSchedule(store); }}
          className="shrink-0 h-7 w-7 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
          title="Termin erstellen"
        >
          <CalendarPlus className="h-3.5 w-3.5 text-primary" />
        </button>
      </div>

      {/* Contact person */}
      {store.contact_person && (
        <div className="flex items-center gap-1.5 text-xs">
          <User className="h-3 w-3 shrink-0 text-primary" />
          <span className="font-medium truncate">{store.contact_person}</span>
        </div>
      )}

      {/* Address */}
      {(shortAddr || cityLine) && (
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
          <div className="min-w-0">
            {shortAddr && <span className="block truncate">{shortAddr}</span>}
            {cityLine && <span className="block truncate">{cityLine}</span>}
          </div>
        </div>
      )}

      {/* Phone */}
      {store.phone && (
        <div className="flex items-center gap-1.5 text-xs">
          <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
          <a href={`tel:${store.phone}`} className="hover:underline text-primary truncate" onClick={e => e.stopPropagation()}>
            {store.phone}
          </a>
        </div>
      )}

      {/* Email */}
      {store.email && (
        <div className="flex items-center gap-1.5 text-xs">
          <Mail className="h-3 w-3 shrink-0 text-muted-foreground" />
          <a href={`mailto:${store.email}`} className="hover:underline text-primary truncate" onClick={e => e.stopPropagation()}>
            {store.email}
          </a>
        </div>
      )}

      {/* Website */}
      {store.website && (
        <div className="flex items-center gap-1.5 text-xs">
          <Globe className="h-3 w-3 shrink-0 text-muted-foreground" />
          <a href={store.website} target="_blank" rel="noreferrer" className="hover:underline text-primary truncate flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
            {(() => { try { return new URL(store.website).hostname; } catch { return store.website; } })()}
            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
          </a>
        </div>
      )}

      {/* Rating */}
      <Stars rating={store.google_rating} />

      {/* Inline note title */}
      <div
        className="mt-1"
        onClick={(e) => { e.stopPropagation(); setEditingNoteTitle(true); }}
      >
        {editingNoteTitle ? (
          <input
            autoFocus
            value={localNoteTitle}
            onChange={(e) => setLocalNoteTitle(e.target.value)}
            onBlur={() => {
              setEditingNoteTitle(false);
              onNoteTitleSave(store.id, localNoteTitle);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setEditingNoteTitle(false);
                onNoteTitleSave(store.id, localNoteTitle);
              }
            }}
            className="w-full text-xs bg-muted/50 border border-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
            placeholder="Notiztitel eingeben..."
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="flex items-start gap-1.5 text-[11px] min-h-[24px] px-2 py-1 rounded bg-muted/30 hover:bg-muted/50 transition-colors cursor-text">
            <MessageSquare className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />
            <span className={cn('line-clamp-2', store.note_title ? 'text-foreground' : 'text-muted-foreground/50 italic')}>
              {store.note_title || 'Notiztitel...'}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground/70 pt-0.5 border-t border-border/30">
        <span>{format(new Date(store.created_at), 'dd.MM.yyyy', { locale: de })}</span>
        {store.google_reviews_count ? (
          <span>{store.google_reviews_count} Bewertungen</span>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function LeadsPipeline() {
  const [stores, setStores] = useState<DiscoveredStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const draggedId = useRef<string | null>(null);
  const [activeStage, setActiveStage] = useState<string>('neu');

  // Detail dialog
  const [selected, setSelected] = useState<DiscoveredStore | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editNoteTitle, setEditNoteTitle] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Schedule dialog
  const [scheduleStore, setScheduleStore] = useState<DiscoveredStore | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);

  // New deal dialog
  const [newDealStage, setNewDealStage] = useState<string | null>(null);
  const [newDealName, setNewDealName] = useState('');
  const [newDealLoading, setNewDealLoading] = useState(false);

  /* ---- Fetch ---- */
  const fetchStores = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('discovered_stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStores(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Fehler beim Laden der Pipeline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  /* ---- Group stores by stage ---- */
  const storesByStage = STAGES.reduce((acc, stage) => {
    acc[stage.key] = stores.filter(s => mapStatus(s.status) === stage.key);
    return acc;
  }, {} as Record<string, DiscoveredStore[]>);

  

  /* ---- Drag & drop ---- */
  const handleDragStart = (id: string) => (e: React.DragEvent) => {
    draggedId.current = id;
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (stage: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  };

  const handleDragLeave = () => setDragOverStage(null);

  const handleDrop = (stage: string) => async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverStage(null);
    const id = draggedId.current;
    if (!id) return;
    draggedId.current = null;

    // Optimistic update
    setStores(prev =>
      prev.map(s => (s.id === id ? { ...s, status: stage } : s))
    );

    const { error } = await supabase
      .from('discovered_stores')
      .update({ status: stage, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Fehler beim Verschieben');
      fetchStores();
    }
  };

  /* ---- Actions ---- */
  const moveToArchive = async (id: string, target: 'gewonnen' | 'verloren') => {
    const { error } = await supabase
      .from('discovered_stores')
      .update({ status: target, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Fehler');
    } else {
      toast.success(target === 'gewonnen' ? '🎉 Deal gewonnen!' : 'Als verloren markiert');
      setSelected(null);
      fetchStores();
    }
  };

  const deleteStore = async (id: string) => {
    const { error } = await supabase.from('discovered_stores').delete().eq('id', id);
    if (error) {
      toast.error('Fehler beim Löschen');
    } else {
      toast.success('Gelöscht');
      setSelected(null);
      fetchStores();
    }
  };

  const saveNotes = async () => {
    if (!selected) return;
    const { error } = await supabase
      .from('discovered_stores')
      .update({ notes: editNotes || null, updated_at: new Date().toISOString() })
      .eq('id', selected.id);

    if (error) {
      toast.error('Fehler');
    } else {
      toast.success('Gespeichert');
      setSelected(null);
      fetchStores();
    }
  };

  const createNewDeal = async () => {
    if (!newDealName.trim() || !newDealStage) return;
    setNewDealLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht eingeloggt');

      const { error } = await supabase.from('discovered_stores').insert({
        name: newDealName.trim(),
        admin_user_id: user.id,
        status: newDealStage,
        enrichment_status: 'pending',
      });

      if (error) throw error;
      toast.success('Deal erstellt');
      setNewDealStage(null);
      setNewDealName('');
      fetchStores();
    } catch (err: any) {
      toast.error(err.message || 'Fehler');
    } finally {
      setNewDealLoading(false);
    }
  };

  /* ---- Render ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground text-sm">
            {stores.length} Leads
          </p>
        </div>
      </div>

      {/* Accordion-style pipeline */}
      <div className="flex-1 overflow-hidden pb-4">
        <div className="flex h-full gap-0">
          {STAGES.map((stage) => {
            const items = storesByStage[stage.key] || [];
            const isActive = activeStage === stage.key;
            const isDragOver = dragOverStage === stage.key;

            return (
              <div
                key={stage.key}
                onClick={() => !isActive && setActiveStage(stage.key)}
                onDragOver={handleDragOver(stage.key)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop(stage.key)}
                className="flex flex-col rounded-xl overflow-hidden"
                style={{
                  width: isActive ? 400 : (isDragOver ? 80 : 52),
                  minWidth: isActive ? 280 : (isDragOver ? 80 : 52),
                  maxWidth: isActive ? 400 : (isDragOver ? 80 : 52),
                  cursor: isActive ? 'default' : 'pointer',
                  transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1), min-width 400ms cubic-bezier(0.4, 0, 0.2, 1), max-width 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {/* Collapsed view - no height/position animation, just instant show/hide */}
                {!isActive && (
                  <div
                    className="flex flex-col items-center w-full h-full overflow-hidden"
                    style={{ backgroundColor: stage.bgColor }}
                  >
                    <div className="py-3 flex flex-col items-center gap-1 shrink-0">
                      <span className="text-white font-bold text-lg leading-none">{items.length}</span>
                      <span className="text-white/70 text-[9px] font-medium"
                        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                        {stage.label}
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto w-full px-1.5 pb-2 space-y-1.5">
                      {items.map((store) => (
                        <div key={store.id} className="w-full aspect-square rounded-lg overflow-hidden bg-white/20 flex items-center justify-center"
                          style={{ maxWidth: 52, maxHeight: 52 }}
                          title={store.name}>
                          {store.google_photo_url ? (
                            <img src={store.google_photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white font-bold text-sm">{store.name.charAt(0)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expanded content */}
                {isActive && (
                  <div className="flex flex-col flex-1 overflow-hidden animate-fade-in">
                  {/* Column header */}
                  <div className="rounded-t-xl px-4 py-2.5 flex items-center gap-3 shrink-0" style={{ backgroundColor: stage.bgColor }}>
                    <span className="text-white font-semibold text-sm">{stage.label}</span>
                    <span className="text-white/80 text-xs font-medium bg-white/20 rounded-full px-2 py-0.5">
                      {items.length}
                    </span>
                  </div>

                  {/* + Neuer Deal */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setNewDealStage(stage.key); setNewDealName(''); }}
                    className="w-full border border-dashed border-border rounded-none py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-1.5 bg-muted/30 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    Neuer Deal
                  </button>

                  {/* Cards */}
                  <div
                    className={cn(
                      'flex-1 rounded-b-xl border border-t-0 border-border/40 p-2 space-y-2 overflow-y-auto transition-colors',
                      isDragOver ? 'bg-primary/5 border-primary/30' : 'bg-muted/20'
                    )}
                  >
                    {items.length === 0 && !isDragOver && (
                      <p className="text-center text-xs text-muted-foreground/50 py-8">Keine Deals</p>
                    )}
                    {items.map((store) => (
                      <DealCard
                        key={store.id}
                        store={store}
                        onDragStart={handleDragStart(store.id)}
                        onClick={() => { setSelected(store); setEditNotes(store.notes || ''); }}
                      />
                    ))}
                  </div>
                </div>
                )}
              </div>
            );
          })}
        </div>
      </div>


      {/* ---- Detail dialog ---- */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selected?.google_photo_url ? (
                <img src={selected.google_photo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{selected?.name.charAt(0)}</span>
                </div>
              )}
              <div>
                <p>{selected?.name}</p>
                {selected?.industry && (
                  <p className="text-sm font-normal text-muted-foreground">{selected.industry}</p>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selected.contact_person && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selected.contact_person}</span>
                  </div>
                )}
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                    <Phone className="h-4 w-4" />
                    <span>{selected.phone}</span>
                  </a>
                )}
                {selected.email && (
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-primary hover:underline">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{selected.email}</span>
                  </a>
                )}
                {selected.website && (
                  <a href={selected.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                    <Globe className="h-4 w-4" />
                    <span className="truncate">{new URL(selected.website).hostname}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {selected.address && (
                  <div className="flex items-center gap-2 col-span-2">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{selected.address}</span>
                  </div>
                )}
              </div>

              <Stars rating={selected.google_rating} />


              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Notizen</label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Interne Notizen hinzufügen..."
                />
              </div>

              {/* Stage selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Phase ändern</label>
                <div className="flex flex-wrap gap-1.5">
                  {STAGES.map((stage) => (
                    <button
                      key={stage.key}
                      onClick={async () => {
                        await supabase.from('discovered_stores').update({ status: stage.key, updated_at: new Date().toISOString() }).eq('id', selected.id);
                        toast.success(`Verschoben → ${stage.label}`);
                        setSelected(null);
                        fetchStores();
                      }}
                      style={{ backgroundColor: stage.bgColor }}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity',
                        mapStatus(selected.status) === stage.key ? 'opacity-100 ring-2 ring-offset-2 ring-offset-background' : 'opacity-60 hover:opacity-100'
                      )}
                      
                    >
                      {stage.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={() => selected && deleteStore(selected.id)}>
                <Trash2 className="h-4 w-4 mr-1" /> Löschen
              </Button>
              <Button variant="outline" size="sm" className="text-rose-500 border-rose-500/30" onClick={() => selected && moveToArchive(selected.id, 'verloren')}>
                Verloren
              </Button>
              <Button variant="outline" size="sm" className="text-emerald-500 border-emerald-500/30" onClick={() => selected && moveToArchive(selected.id, 'gewonnen')}>
                Gewonnen
              </Button>
            </div>
            <Button onClick={saveNotes}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- New deal dialog ---- */}
      <Dialog open={!!newDealStage} onOpenChange={() => setNewDealStage(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Neuer Deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Geschäftsname eingeben..."
              value={newDealName}
              onChange={(e) => setNewDealName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createNewDeal()}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Wird in die Phase „{STAGES.find(s => s.key === newDealStage)?.label}" eingeordnet.
              Du kannst den Deal anschließend mit Details anreichern.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDealStage(null)}>Abbrechen</Button>
            <Button onClick={createNewDeal} disabled={!newDealName.trim() || newDealLoading}>
              {newDealLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bottom drop zone                                                   */
/* ------------------------------------------------------------------ */
function DropZone({
  label,
  className,
  onDrop,
  setDragOverStage,
  stageKey,
  dragOverStage,
}: {
  label: string;
  className: string;
  onDrop: (id: string) => Promise<void>;
  setDragOverStage: (s: string | null) => void;
  stageKey: string;
  dragOverStage: string | null;
}) {
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOverStage(stageKey); }}
      onDragLeave={() => setDragOverStage(null)}
      onDrop={async (e) => {
        e.preventDefault();
        setDragOverStage(null);
        const id = e.dataTransfer.getData('text/plain');
        if (id) await onDrop(id);
      }}
      className={cn(
        'border-2 border-dashed rounded-xl py-3 text-center text-sm font-semibold transition-all cursor-default',
        dragOverStage === stageKey && 'scale-105 shadow-lg',
        className
      )}
    >
      {label}
    </div>
  );
}

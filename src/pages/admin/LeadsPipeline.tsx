import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Plus, Star, User, MapPin, Phone, Mail, Globe, MessageSquare,
  Trash2, X, Search, Loader2, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
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
  status: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
}

/* ------------------------------------------------------------------ */
/*  Pipeline stages                                                    */
/* ------------------------------------------------------------------ */

const STAGES = [
  { key: 'neu', label: 'Neu', color: 'bg-blue-500', border: 'border-blue-500/30', dot: 'bg-blue-400' },
  { key: 'angerufen', label: 'Angerufen', color: 'bg-rose-500', border: 'border-rose-500/30', dot: 'bg-rose-400' },
  { key: 'terminiert', label: 'Terminiert', color: 'bg-yellow-500', border: 'border-yellow-500/30', dot: 'bg-yellow-400' },
  { key: 'besucht', label: 'Besucht', color: 'bg-orange-500', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  { key: 'gewonnen', label: 'Gewonnen', color: 'bg-green-500', border: 'border-green-500/30', dot: 'bg-green-400' },
  { key: 'verloren', label: 'Verloren', color: 'bg-red-500', border: 'border-red-500/30', dot: 'bg-red-400' },
  { key: 'standby', label: 'Standby', color: 'bg-gray-500', border: 'border-gray-500/30', dot: 'bg-gray-400' },
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
}: {
  store: DiscoveredStore;
  onDragStart: (e: React.DragEvent) => void;
  onClick: () => void;
}) {
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
        {store.enrichment_status === 'done' && (
          <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shrink-0">
            ✓ KI
          </Badge>
        )}
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

      {/* AI Summary */}
      {store.ai_summary && (
        <p className="text-[11px] text-muted-foreground line-clamp-2 bg-muted/50 rounded-md px-2 py-1.5 leading-relaxed">
          {store.ai_summary}
        </p>
      )}

      {/* Notes preview */}
      {store.notes && (
        <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <MessageSquare className="h-3 w-3 shrink-0 mt-0.5" />
          <span className="line-clamp-2 italic">{store.notes}</span>
        </div>
      )}

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

  // Detail dialog
  const [selected, setSelected] = useState<DiscoveredStore | null>(null);
  const [editNotes, setEditNotes] = useState('');

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

  const wonCount = stores.filter(s => s.status === 'gewonnen').length;

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
          <h1 className="text-2xl font-bold">Lead Pipeline</h1>
          <p className="text-muted-foreground text-sm">
            {stores.length} Leads · {wonCount} gewonnen
          </p>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max h-full">
          {STAGES.map((stage) => {
            const items = storesByStage[stage.key] || [];
            const isDragOver = dragOverStage === stage.key;

            return (
              <div
                key={stage.key}
                className="w-[280px] flex flex-col shrink-0"
                onDragOver={handleDragOver(stage.key)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop(stage.key)}
              >
                {/* Column header */}
                <div className={cn('rounded-t-xl px-4 py-2.5 flex items-center justify-between', stage.color)}>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-sm">{stage.label}</span>
                  </div>
                  <span className="text-white/80 text-xs font-medium bg-white/20 rounded-full px-2 py-0.5">
                    {items.length}
                  </span>
                </div>

                {/* + Neuer Deal */}
                <button
                  onClick={() => { setNewDealStage(stage.key); setNewDealName(''); }}
                  className="w-full border border-dashed border-border rounded-none py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-1.5 bg-muted/30"
                >
                  <Plus className="h-4 w-4" />
                  Neuer Deal
                </button>

                {/* Cards */}
                <div
                  className={cn(
                    'flex-1 rounded-b-xl border border-t-0 border-border/40 p-2 space-y-2 overflow-y-auto transition-colors min-h-[200px]',
                    isDragOver ? 'bg-primary/5 border-primary/30' : 'bg-muted/20'
                  )}
                >
                  {items.length === 0 && !isDragOver && (
                    <p className="text-center text-xs text-muted-foreground/50 py-8">
                      Keine Deals
                    </p>
                  )}
                  {items.map((store) => (
                    <DealCard
                      key={store.id}
                      store={store}
                      onDragStart={handleDragStart(store.id)}
                      onClick={() => {
                        setSelected(store);
                        setEditNotes(store.notes || '');
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="grid grid-cols-4 gap-2 shrink-0 border-t border-border pt-3">
        <DropZone
          label="Löschen"
          className="text-muted-foreground border-muted-foreground/30 hover:border-destructive hover:text-destructive"
          onDrop={async (id) => { await deleteStore(id); }}
          setDragOverStage={setDragOverStage}
          stageKey="__delete"
          dragOverStage={dragOverStage}
        />
        <DropZone
          label="Verloren"
          className="text-rose-500 border-rose-500/30 hover:border-rose-500 hover:bg-rose-500/5"
          onDrop={async (id) => { await moveToArchive(id, 'verloren'); }}
          setDragOverStage={setDragOverStage}
          stageKey="__verloren"
          dragOverStage={dragOverStage}
        />
        <DropZone
          label="Gewonnen"
          className="text-emerald-500 border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/5"
          onDrop={async (id) => { await moveToArchive(id, 'gewonnen'); }}
          setDragOverStage={setDragOverStage}
          stageKey="__gewonnen"
          dragOverStage={dragOverStage}
        />
        <DropZone
          label="Wiedervorlage"
          className="text-amber-500 border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/5"
          onDrop={async (id) => {
            await supabase.from('discovered_stores').update({ status: 'kontaktaufnahme', updated_at: new Date().toISOString() }).eq('id', id);
            toast.success('Zurück zu Kontaktaufnahme');
            fetchStores();
          }}
          setDragOverStage={setDragOverStage}
          stageKey="__wiedervorlage"
          dragOverStage={dragOverStage}
        />
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

              {/* AI summary */}
              {selected.ai_summary && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="text-xs font-medium text-muted-foreground mb-1">KI-Zusammenfassung</p>
                  <p>{selected.ai_summary}</p>
                </div>
              )}

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
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity',
                        stage.color,
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

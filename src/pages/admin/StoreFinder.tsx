import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import {
  Search, MapPin, Phone, Globe, Star, Plus, LayoutGrid, List, Map as MapIcon,
  Loader2, Sparkles, Building2, Mail, User, ExternalLink, Trash2,
} from 'lucide-react';
import { useGoogleMapsApiKey } from '@/hooks/useGoogleMapsApiKey';
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api';

const GMAP_LIBRARIES: ('places')[] = ['places'];

// ── Types ──────────────────────────────────────────────────────────────────────

interface PlaceResult {
  place_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  reviews_count: number | null;
  photo_reference: string | null;
  types: string[];
  opening_hours: any;
  business_status: string;
}

interface DiscoveredStore {
  id: string;
  place_id: string | null;
  name: string;
  address: string | null;
  street: string | null;
  house_number: string | null;
  postal_code: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
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
  enrichment_data: any;
  notes: string | null;
  status: string;
  created_at: string;
}

type ViewMode = 'grid' | 'list' | 'map';

const CATEGORIES = [
  { value: 'bakery', label: 'Bäckerei' },
  { value: 'cafe', label: 'Café' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'hair_care', label: 'Friseur' },
  { value: 'beauty_salon', label: 'Kosmetik' },
  { value: 'florist', label: 'Blumenladen' },
  { value: 'clothing_store', label: 'Bekleidung' },
  { value: 'pharmacy', label: 'Apotheke' },
  { value: 'gym', label: 'Fitnessstudio' },
  { value: 'spa', label: 'Spa / Wellness' },
  { value: 'pet_store', label: 'Tierbedarf' },
  { value: 'jewelry_store', label: 'Juwelier' },
  { value: 'book_store', label: 'Buchhandlung' },
];

// ── Stars Component ────────────────────────────────────────────────────────────

function RatingStars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-xs text-muted-foreground">Keine Bewertung</span>;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

// ── Store Card ─────────────────────────────────────────────────────────────────

function StoreCard({
  store,
  onEnrich,
  onDelete,
  enriching,
}: {
  store: DiscoveredStore;
  onEnrich: (id: string) => void;
  onDelete: (id: string) => void;
  enriching: boolean;
}) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        {/* Header with photo */}
        <div className="h-24 bg-gradient-to-br from-primary/20 to-primary/5 relative flex items-center px-4 gap-4">
          {store.google_photo_url ? (
            <img
              src={store.google_photo_url}
              alt={store.name}
              className="h-16 w-16 rounded-xl object-cover shadow-md border-2 border-background"
            />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center border-2 border-background shadow-md">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{store.name}</h3>
            {store.industry && (
              <Badge variant="secondary" className="text-[10px] mt-1">
                {store.industry}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(store.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Info */}
        <div className="p-4 space-y-2">
          <RatingStars rating={store.google_rating} />

          {store.contact_person && (
            <div className="flex items-center gap-2 text-xs">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{store.contact_person}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{store.address || 'Keine Adresse'}</span>
          </div>

          {store.phone && (
            <div className="flex items-center gap-2 text-xs">
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <a href={`tel:${store.phone}`} className="hover:underline truncate">
                {store.phone}
              </a>
            </div>
          )}

          {store.email && (
            <div className="flex items-center gap-2 text-xs">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <a href={`mailto:${store.email}`} className="hover:underline truncate">
                {store.email}
              </a>
            </div>
          )}

          {store.website && (
            <div className="flex items-center gap-2 text-xs">
              <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <a href={store.website} target="_blank" rel="noopener noreferrer" className="hover:underline truncate flex items-center gap-1">
                {new URL(store.website).hostname}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {store.ai_summary && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-3 bg-muted/50 rounded-lg p-2">
              {store.ai_summary}
            </p>
          )}

          {/* Enrichment button */}
          {store.enrichment_status === 'pending' && (
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-2 text-xs"
              onClick={() => onEnrich(store.id)}
              disabled={enriching}
            >
              {enriching ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-1" />
              )}
              KI-Recherche starten
            </Button>
          )}

          {store.enrichment_status === 'enriching' && (
            <div className="flex items-center gap-2 text-xs text-primary mt-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Wird recherchiert…
            </div>
          )}

          {store.enrichment_status === 'done' && (
            <Badge variant="secondary" className="text-[10px] mt-2">
              ✓ KI-Recherche abgeschlossen
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Map View ───────────────────────────────────────────────────────────────────

const DEFAULT_CENTER = { lat: 48.137154, lng: 11.576124 };
const MAP_CONTAINER = { width: '100%', height: '600px' };

function StoreMapView({
  stores,
  searchResults,
  searchCenter,
  onAddStore,
}: {
  stores: DiscoveredStore[];
  searchResults: PlaceResult[];
  searchCenter: { lat: number; lng: number } | null;
  onAddStore: (place: PlaceResult) => void;
}) {
  const { apiKey, loading: keyLoading } = useGoogleMapsApiKey();
  const [selectedStore, setSelectedStore] = useState<DiscoveredStore | null>(null);
  const [selectedResult, setSelectedResult] = useState<PlaceResult | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
    libraries: GMAP_LIBRARIES,
  });

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const center = searchCenter || DEFAULT_CENTER;

  if (keyLoading || !isLoaded) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0 relative">
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER}
          center={center}
          zoom={searchCenter ? 13 : 10}
          onLoad={onMapLoad}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
            styles: [
              { featureType: 'poi', stylers: [{ visibility: 'off' }] },
              { featureType: 'transit', stylers: [{ visibility: 'off' }] },
            ],
          }}
        >
          {/* Saved stores - purple markers */}
          {stores.filter(s => s.latitude && s.longitude).map((store) => (
            <OverlayView
              key={store.id}
              position={{ lat: store.latitude!, lng: store.longitude! }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            >
              <div
                className="cursor-pointer transform -translate-x-1/2 -translate-y-full"
                onClick={() => { setSelectedStore(store); setSelectedResult(null); }}
              >
                <div className="bg-primary text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center shadow-lg border-2 border-background text-xs font-bold">
                  {store.enrichment_status === 'done' ? '✓' : <Building2 className="h-4 w-4" />}
                </div>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-primary mx-auto -mt-0.5" />
              </div>
            </OverlayView>
          ))}

          {/* Search results - blue markers */}
          {searchResults.filter(p => p.latitude && p.longitude).map((place) => (
            <OverlayView
              key={place.place_id}
              position={{ lat: place.latitude, lng: place.longitude }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            >
              <div
                className="cursor-pointer transform -translate-x-1/2 -translate-y-full"
                onClick={() => { setSelectedResult(place); setSelectedStore(null); }}
              >
                <div className="bg-blue-500 text-white rounded-full h-7 w-7 flex items-center justify-center shadow-lg border-2 border-background">
                  <Plus className="h-3.5 w-3.5" />
                </div>
                <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-blue-500 mx-auto -mt-0.5" />
              </div>
            </OverlayView>
          ))}

          {/* Info window for selected saved store */}
          {selectedStore && selectedStore.latitude && selectedStore.longitude && (
            <OverlayView
              position={{ lat: selectedStore.latitude, lng: selectedStore.longitude }}
              mapPaneName={OverlayView.FLOAT_PANE}
            >
              <div className="bg-card rounded-xl shadow-xl border p-3 w-64 -translate-x-1/2 -translate-y-[calc(100%+40px)]">
                <button className="absolute top-2 right-2 text-muted-foreground hover:text-foreground" onClick={() => setSelectedStore(null)}>✕</button>
                <div className="flex items-center gap-3 mb-2">
                  {selectedStore.google_photo_url ? (
                    <img src={selectedStore.google_photo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{selectedStore.name}</p>
                    {selectedStore.industry && <Badge variant="secondary" className="text-[10px]">{selectedStore.industry}</Badge>}
                  </div>
                </div>
                <RatingStars rating={selectedStore.google_rating} />
                {selectedStore.address && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" /> {selectedStore.address}
                  </p>
                )}
                {selectedStore.phone && (
                  <p className="text-xs mt-1 flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <a href={`tel:${selectedStore.phone}`} className="hover:underline">{selectedStore.phone}</a>
                  </p>
                )}
                {selectedStore.contact_person && (
                  <p className="text-xs mt-1 flex items-center gap-1">
                    <User className="h-3 w-3 shrink-0 text-muted-foreground" /> {selectedStore.contact_person}
                  </p>
                )}
              </div>
            </OverlayView>
          )}

          {/* Info window for search result */}
          {selectedResult && (
            <OverlayView
              position={{ lat: selectedResult.latitude, lng: selectedResult.longitude }}
              mapPaneName={OverlayView.FLOAT_PANE}
            >
              <div className="bg-card rounded-xl shadow-xl border p-3 w-56 -translate-x-1/2 -translate-y-[calc(100%+36px)]">
                <button className="absolute top-2 right-2 text-muted-foreground hover:text-foreground" onClick={() => setSelectedResult(null)}>✕</button>
                <p className="font-semibold text-sm pr-4">{selectedResult.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedResult.address}</p>
                <RatingStars rating={selectedResult.rating} />
                <Button
                  size="sm"
                  className="w-full mt-2 h-7 text-xs"
                  onClick={() => { onAddStore(selectedResult); setSelectedResult(null); }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Hinzufügen
                </Button>
              </div>
            </OverlayView>
          )}
        </GoogleMap>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur rounded-lg shadow-md border p-2 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span>Gespeichert</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span>Suchergebnis</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function StoreFinder() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [savedStores, setSavedStores] = useState<DiscoveredStore[]>([]);
  const [searching, setSearching] = useState(false);
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [postalCode, setPostalCode] = useState('');
  const [radius, setRadius] = useState(5000);
  const [category, setCategory] = useState('');
  const [keyword, setKeyword] = useState('');
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);

  // Load saved stores
  useEffect(() => {
    loadSavedStores();
  }, []);

  const loadSavedStores = async () => {
    const { data, error } = await supabase
      .from('discovered_stores')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading stores:', error);
      return;
    }
    setSavedStores((data as any) || []);
  };

  const geocodePostalCode = async (plz: string) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${plz}&country=de&format=json&limit=1`
      );
      const data = await res.json();
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (e) {
      console.error('Geocoding error:', e);
    }
    return null;
  };

  const searchPlaces = async () => {
    if (!postalCode && !searchCenter) {
      toast.error('Bitte PLZ eingeben');
      return;
    }

    setSearching(true);
    try {
      let center = searchCenter;
      if (!center && postalCode) {
        center = await geocodePostalCode(postalCode);
        if (!center) {
          toast.error('PLZ konnte nicht gefunden werden');
          setSearching(false);
          return;
        }
        setSearchCenter(center);
      }

      const { data, error } = await supabase.functions.invoke('search-places', {
        body: {
          latitude: center!.lat,
          longitude: center!.lng,
          radius,
          type: category || undefined,
          keyword: keyword || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Filter out already saved places
      const savedPlaceIds = new Set(savedStores.map((s) => s.place_id));
      const filtered = (data.places || []).filter((p: PlaceResult) => !savedPlaceIds.has(p.place_id));

      setSearchResults(filtered);
      toast.success(`${filtered.length} Geschäfte gefunden`);
    } catch (e: any) {
      console.error('Search error:', e);
      toast.error(e.message || 'Suche fehlgeschlagen');
    } finally {
      setSearching(false);
    }
  };

  const addStore = async (place: PlaceResult) => {
    try {
      // Get detailed info first
      const { data: detailData, error: detailError } = await supabase.functions.invoke('place-details', {
        body: { place_id: place.place_id },
      });

      if (detailError) throw detailError;
      if (detailData?.error) throw new Error(detailData.error);

      const d = detailData.details;
      const categoryLabel = CATEGORIES.find((c) => place.types?.includes(c.value))?.label || null;

      const { data: userData } = await supabase.auth.getUser();

      const { error: insertError } = await supabase.from('discovered_stores').insert({
        admin_user_id: userData.user!.id,
        place_id: place.place_id,
        name: d.name,
        address: d.address,
        street: d.street,
        house_number: d.house_number,
        postal_code: d.postal_code,
        city: d.city,
        latitude: d.latitude,
        longitude: d.longitude,
        phone: d.phone,
        website: d.website,
        google_rating: d.google_rating,
        google_reviews_count: d.google_reviews_count,
        google_photo_url: d.google_photo_url,
        industry: categoryLabel,
        opening_hours: d.opening_hours,
        enrichment_status: 'pending',
        status: 'new',
      } as any);

      if (insertError) throw insertError;

      // Remove from search results
      setSearchResults((prev) => prev.filter((p) => p.place_id !== place.place_id));
      toast.success(`${place.name} hinzugefügt`);
      loadSavedStores();
    } catch (e: any) {
      console.error('Add store error:', e);
      toast.error(e.message || 'Fehler beim Hinzufügen');
    }
  };

  const enrichStore = async (storeId: string) => {
    const store = savedStores.find((s) => s.id === storeId);
    if (!store) return;

    setEnrichingIds((prev) => new Set(prev).add(storeId));
    try {
      const { data, error } = await supabase.functions.invoke('enrich-store', {
        body: { store_id: storeId, website: store.website },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('KI-Recherche abgeschlossen');
      loadSavedStores();
    } catch (e: any) {
      console.error('Enrich error:', e);
      toast.error(e.message || 'Recherche fehlgeschlagen');
    } finally {
      setEnrichingIds((prev) => {
        const next = new Set(prev);
        next.delete(storeId);
        return next;
      });
    }
  };

  const deleteStore = async (storeId: string) => {
    if (!confirm('Diesen Store wirklich löschen?')) return;

    const { error } = await supabase.from('discovered_stores').delete().eq('id', storeId);
    if (error) {
      toast.error('Fehler beim Löschen');
      return;
    }
    toast.success('Store gelöscht');
    loadSavedStores();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Store Finder</h1>
        <p className="text-muted-foreground">Finde und recherchiere potenzielle Kunden in deiner Umgebung</p>
      </div>

      {/* Search Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">PLZ</label>
              <Input
                placeholder="z.B. 80331"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-32"
                onKeyDown={(e) => e.key === 'Enter' && searchPlaces()}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Kategorie</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Alle Kategorien" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kategorien</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Suchbegriff</label>
              <Input
                placeholder="z.B. Bäcker Müller"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-44"
                onKeyDown={(e) => e.key === 'Enter' && searchPlaces()}
              />
            </div>

            <div className="space-y-1.5 w-48">
              <label className="text-xs font-medium">
                Umkreis: {(radius / 1000).toFixed(1)} km
              </label>
              <Slider
                value={[radius]}
                onValueChange={(v) => setRadius(v[0])}
                min={1000}
                max={50000}
                step={1000}
              />
            </div>

            <Button onClick={searchPlaces} disabled={searching} className="shrink-0">
              {searching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Suchen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Suchergebnisse ({searchResults.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {searchResults.map((place) => (
              <Card key={place.place_id} className="overflow-hidden">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-sm">{place.name}</h3>
                    <Button size="sm" variant="default" className="shrink-0 h-7 text-xs" onClick={() => addStore(place)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Hinzufügen
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{place.address}</span>
                  </div>
                  <RatingStars rating={place.rating} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Saved Stores */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Meine Stores ({savedStores.length})</h2>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setViewMode('map')}
            >
              <MapIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {savedStores.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Noch keine Stores gespeichert</p>
              <p className="text-sm">Nutze die Suche oben, um Geschäfte zu finden und hinzuzufügen.</p>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {savedStores.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                onEnrich={enrichStore}
                onDelete={deleteStore}
                enriching={enrichingIds.has(store.id)}
              />
            ))}
          </div>
        ) : viewMode === 'list' ? (
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-3 text-xs font-medium">Name</th>
                    <th className="text-left p-3 text-xs font-medium">Adresse</th>
                    <th className="text-left p-3 text-xs font-medium">Telefon</th>
                    <th className="text-left p-3 text-xs font-medium">Bewertung</th>
                    <th className="text-left p-3 text-xs font-medium">Status</th>
                    <th className="text-right p-3 text-xs font-medium">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {savedStores.map((store) => (
                    <tr key={store.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {store.google_photo_url ? (
                            <img src={store.google_photo_url} alt="" className="h-8 w-8 rounded object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{store.name}</p>
                            {store.contact_person && (
                              <p className="text-xs text-muted-foreground">{store.contact_person}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">{store.address || '–'}</td>
                      <td className="p-3 text-sm">{store.phone || '–'}</td>
                      <td className="p-3">
                        <RatingStars rating={store.google_rating} />
                      </td>
                      <td className="p-3">
                        {store.enrichment_status === 'done' ? (
                          <Badge variant="secondary" className="text-[10px]">Recherchiert</Badge>
                        ) : store.enrichment_status === 'enriching' ? (
                          <Badge className="text-[10px] bg-primary">Läuft…</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Ausstehend</Badge>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {store.enrichment_status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => enrichStore(store.id)}
                              disabled={enrichingIds.has(store.id)}
                            >
                              <Sparkles className="h-3.5 w-3.5 mr-1" />
                              Recherche
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteStore(store.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ) : (
          <StoreMapView stores={savedStores} searchResults={searchResults} searchCenter={searchCenter} onAddStore={addStore} />
        )}
      </div>
    </div>
  );
}

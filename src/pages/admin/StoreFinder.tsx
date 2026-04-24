import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSalesRepActive } from '@/hooks/useSalesRepActive';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Search, MapPin, Phone, Globe, Star, Plus,
  Loader2, Sparkles, Building2, Mail, User, ExternalLink, Trash2, Lock, Clock, Check,
} from 'lucide-react';
import { useGoogleMapsApiKey } from '@/hooks/useGoogleMapsApiKey';
import { GoogleMap, useJsApiLoader, OverlayView, Circle } from '@react-google-maps/api';

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

// ── Pipeline stage colors (matching LeadsPipeline) ─────────────────────────────
function getStageColor(status: string): string {
  const map: Record<string, string> = {
    neu: 'hsl(262, 40%, 82%)',
    new: 'hsl(262, 40%, 82%)',
    kontaktaufnahme: 'hsl(262, 40%, 82%)',
    angerufen: 'hsl(262, 45%, 72%)',
    telefonanruf: 'hsl(262, 45%, 72%)',
    terminiert: 'hsl(262, 48%, 62%)',
    produktbesprechung: 'hsl(262, 48%, 62%)',
    in_verhandlung: 'hsl(262, 48%, 62%)',
    besucht: 'hsl(262, 50%, 52%)',
    vor_ort_besuch: 'hsl(262, 50%, 52%)',
    gewonnen: 'hsl(262, 55%, 45%)',
    verloren: 'hsl(0, 0%, 25%)',
    standby: 'hsl(262, 15%, 55%)',
  };
  return map[status] || 'hsl(262, 40%, 82%)';
}


// ── Main Component ─────────────────────────────────────────────────────────────

function StoreFinderContent({ apiKey }: { apiKey: string }) {
  const location = useLocation();
  const { user } = useAuth();
  const isSalesRepCtx = location.pathname.startsWith('/vertriebler');
  const { requireActive } = useSalesRepActive();

  const mapRef = useRef<google.maps.Map | null>(null);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [savedStores, setSavedStores] = useState<DiscoveredStore[]>([]);
  const [searching, setSearching] = useState(false);
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [postalCode, setPostalCode] = useState('');
  const [radius, setRadius] = useState(5000);
  const [category, setCategory] = useState('');
  const [keyword, setKeyword] = useState('');
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);

  // Name-based search (Google Places Text Search)
  const [nameQuery, setNameQuery] = useState('');
  const [nameResults, setNameResults] = useState<PlaceResult[]>([]);
  const [nameSearching, setNameSearching] = useState(false);
  const [nameDropdownOpen, setNameDropdownOpen] = useState(false);
  const [highlightedPlace, setHighlightedPlace] = useState<PlaceResult | null>(null);
  const nameDebounceRef = useRef<number | null>(null);

  const runNameSearch = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) {
      setNameResults([]);
      return;
    }
    setNameSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('text-search-places', {
        body: { query: q.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const savedPlaceIds = new Set(savedStores.map((s) => s.place_id));
      const filtered = (data.places || []).filter((p: PlaceResult) => !savedPlaceIds.has(p.place_id));
      setNameResults(filtered);
      setNameDropdownOpen(true);
    } catch (e: any) {
      console.error('Name search error:', e);
      toast.error(e.message || 'Suche fehlgeschlagen');
    } finally {
      setNameSearching(false);
    }
  }, [savedStores]);

  useEffect(() => {
    if (nameDebounceRef.current) window.clearTimeout(nameDebounceRef.current);
    if (!nameQuery.trim()) {
      setNameResults([]);
      setNameDropdownOpen(false);
      return;
    }
    nameDebounceRef.current = window.setTimeout(() => {
      runNameSearch(nameQuery);
    }, 400);
    return () => {
      if (nameDebounceRef.current) window.clearTimeout(nameDebounceRef.current);
    };
  }, [nameQuery, runNameSearch]);

  const selectNameResult = (place: PlaceResult) => {
    setHighlightedPlace(place);
    setNameDropdownOpen(false);
    if (mapRef.current && place.latitude && place.longitude) {
      mapRef.current.panTo({ lat: place.latitude, lng: place.longitude });
      mapRef.current.setZoom(16);
    }
  };

  // Load saved stores
  useEffect(() => {
    loadSavedStores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isSalesRepCtx]);

  const loadSavedStores = async () => {
    let query = supabase
      .from('discovered_stores')
      .select('*')
      .order('created_at', { ascending: false });
    if (isSalesRepCtx && user?.id) {
      query = query.eq('admin_user_id', user.id);
    }
    const { data, error } = await query;

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
    if (!requireActive()) return;
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
    if (!requireActive()) return;
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
    if (!requireActive()) return;
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

  // Manual add mode
  const [manualAddMode, setManualAddMode] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualLatLng, setManualLatLng] = useState<{ lat: number; lng: number } | null>(null);

  // Pin-on-map search mode
  const [pinSearchMode, setPinSearchMode] = useState(false);
  const [searchPin, setSearchPin] = useState<{ lat: number; lng: number } | null>(null);

  // Live-Modus: automatische Suche im sichtbaren Kartenausschnitt
  const [liveMode, setLiveMode] = useState(true);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const liveDebounceRef = useRef<number | null>(null);

  // Detail-Dialog für angeklickte Geschäfte
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPlace, setDetailPlace] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: GMAP_LIBRARIES,
  });

  // Live-Suche: ruft beim Idle der Karte alle Geschäfte im sichtbaren Bereich ab
  const runLiveSearch = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !liveMode) return;
    const bounds = map.getBounds();
    const center = map.getCenter();
    if (!bounds || !center) return;

    // Radius aus Bounds berechnen (max. 25 km, Google-API-Limit)
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const dynRadius = Math.min(
      25000,
      Math.round(
        google.maps.geometry?.spherical?.computeDistanceBetween
          ? google.maps.geometry.spherical.computeDistanceBetween(ne, sw) / 2
          : 5000
      ) || 5000
    );

    try {
      const { data, error } = await supabase.functions.invoke('search-places', {
        body: {
          latitude: center.lat(),
          longitude: center.lng(),
          radius: dynRadius,
          type: category && category !== 'all' ? category : undefined,
          keyword: keyword || undefined,
        },
      });
      if (error || data?.error) return;
      const savedPlaceIds = new Set(savedStores.map((s) => s.place_id));
      const filtered = (data.places || []).filter((p: PlaceResult) => !savedPlaceIds.has(p.place_id));
      setSearchResults(filtered);
    } catch (e) {
      // Silent in live mode
      console.warn('Live search error:', e);
    }
  }, [liveMode, category, keyword, savedStores]);

  const handleMapIdle = useCallback(() => {
    if (!liveMode) return;
    if (liveDebounceRef.current) window.clearTimeout(liveDebounceRef.current);
    liveDebounceRef.current = window.setTimeout(() => {
      runLiveSearch();
    }, 600);
  }, [liveMode, runLiveSearch]);

  // Detail eines Place-IDs laden (für Klick auf Google-eigene POIs oder eigene Marker)
  const openPlaceDetails = useCallback(async (placeId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailPlace(null);
    try {
      const { data, error } = await supabase.functions.invoke('place-details', {
        body: { place_id: placeId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDetailPlace({ ...data.details, place_id: placeId });
    } catch (e: any) {
      console.error('Detail load error:', e);
      toast.error(e.message || 'Details konnten nicht geladen werden');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    if (pinSearchMode) {
      const next = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setSearchPin(next);
      setSearchCenter(next);
      setPostalCode('');
      return;
    }
    if (manualAddMode) {
      setManualLatLng({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    }
  }, [manualAddMode, pinSearchMode]);

  const addManualStore = async () => {
    if (!requireActive()) return;
    if (!manualName.trim() || !manualLatLng) return;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('discovered_stores').insert({
        admin_user_id: userData.user!.id,
        name: manualName.trim(),
        latitude: manualLatLng.lat,
        longitude: manualLatLng.lng,
        enrichment_status: 'pending',
        status: 'new',
      } as any);
      if (error) throw error;
      toast.success(`${manualName} hinzugefügt`);
      setManualAddMode(false);
      setManualName('');
      setManualLatLng(null);
      loadSavedStores();
    } catch (e: any) {
      toast.error(e.message || 'Fehler');
    }
  };

  const mapCenter = searchCenter || (savedStores.length > 0 && savedStores[0].latitude && savedStores[0].longitude
    ? { lat: Number(savedStores[0].latitude), lng: Number(savedStores[0].longitude) }
    : { lat: 48.137154, lng: 11.576124 });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Store Finder</h1>
        <p className="text-muted-foreground text-sm">Finde und recherchiere potenzielle Kunden in deiner Umgebung</p>
      </div>

      {/* Name Search Bar */}
      <Card>
        <CardContent className="p-4">
          <label className="text-xs font-medium mb-1.5 block">
            Geschäft nach Name suchen
          </label>
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="z.B. Bäckerei Müller München"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                onFocus={() => nameResults.length > 0 && setNameDropdownOpen(true)}
                onBlur={() => setTimeout(() => setNameDropdownOpen(false), 200)}
                className="pl-9 pr-9"
              />
              {nameSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
              )}
            </div>

            {nameDropdownOpen && nameResults.length > 0 && (
              <div className="absolute z-30 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-80 overflow-y-auto">
                {nameResults.map((p) => (
                  <button
                    type="button"
                    key={p.place_id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectNameResult(p)}
                    className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b last:border-b-0 flex items-center gap-3"
                  >
                    <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {p.photo_reference ? (
                        <img
                          src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=60&photo_reference=${p.photo_reference}&key=${apiKey}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Building2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" /> {p.address}
                      </p>
                    </div>
                    {p.rating && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        {p.rating.toFixed(1)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {nameDropdownOpen && !nameSearching && nameQuery.trim().length >= 2 && nameResults.length === 0 && (
              <div className="absolute z-30 mt-1 w-full bg-popover border rounded-md shadow-lg p-4 text-center text-sm text-muted-foreground">
                Keine Geschäfte gefunden
              </div>
            )}
          </div>

          {highlightedPlace && (
            <div className="mt-3 flex items-center gap-3 p-3 rounded-md bg-accent/50 border">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{highlightedPlace.name}</p>
                <p className="text-xs text-muted-foreground truncate">{highlightedPlace.address}</p>
              </div>
              <Button
                size="sm"
                className="shrink-0"
                onClick={async () => {
                  await addStore(highlightedPlace);
                  setHighlightedPlace(null);
                  setNameQuery('');
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Hinzufügen
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0"
                onClick={() => setHighlightedPlace(null)}
              >
                ✕
              </Button>
            </div>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">PLZ</label>
              <Input
                placeholder="z.B. 80331"
                value={postalCode}
                onChange={(e) => {
                  setPostalCode(e.target.value);
                  if (e.target.value) {
                    setSearchPin(null);
                  }
                }}
                className="w-32"
                onKeyDown={(e) => e.key === 'Enter' && searchPlaces()}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">oder Pin auf Karte</label>
              <Button
                type="button"
                variant={pinSearchMode ? 'default' : 'outline'}
                size="sm"
                className="h-9"
                onClick={() => {
                  setPinSearchMode((v) => !v);
                  if (manualAddMode) setManualAddMode(false);
                }}
              >
                <MapPin className="h-3.5 w-3.5 mr-1" />
                {pinSearchMode ? 'Pin-Modus aktiv' : 'Pin setzen'}
              </Button>
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

      {/* Split-screen: Map + List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ minHeight: '600px' }}>
        {/* Left side: Map */}
        <Card className="overflow-hidden">
          <CardContent className="p-0 relative h-full" style={{ minHeight: '600px' }}>
            {!isLoaded ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={mapCenter}
                  zoom={searchCenter ? 13 : 10}
                  onLoad={(map) => { mapRef.current = map; }}
                  onClick={handleMapClick}
                  options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: true,
                    styles: [
                      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
                      { featureType: 'transit', stylers: [{ visibility: 'off' }] },
                    ],
                    ...((manualAddMode || pinSearchMode) ? { cursor: 'crosshair' } : {}),
                  }}
                >
                  {/* Search radius circle around the pin */}
                  {searchPin && (
                    <Circle
                      center={searchPin}
                      radius={radius}
                      options={{
                        strokeColor: 'hsl(262, 55%, 45%)',
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                        fillColor: 'hsl(262, 55%, 45%)',
                        fillOpacity: 0.12,
                        clickable: false,
                      }}
                    />
                  )}

                  {/* Search pin marker */}
                  {searchPin && (
                    <OverlayView
                      position={searchPin}
                      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                    >
                      <div className="transform -translate-x-1/2 -translate-y-full">
                        <div className="bg-primary text-primary-foreground rounded-full h-9 w-9 flex items-center justify-center shadow-lg border-2 border-background">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div className="w-0 h-0 border-l-[7px] border-r-[7px] border-t-[9px] border-l-transparent border-r-transparent border-t-primary mx-auto -mt-0.5" />
                      </div>
                    </OverlayView>
                  )}

                  {/* Saved stores */}
                  {savedStores.filter(s => s.latitude && s.longitude).map((store) => {
                    const stageColor = getStageColor(store.status);
                    const size = 40;
                    return (
                      <OverlayView
                        key={store.id}
                        position={{ lat: Number(store.latitude!), lng: Number(store.longitude!) }}
                        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                      >
                        <div className="cursor-pointer" style={{ width: size, height: size, marginLeft: -size/2, marginTop: -size/2 }}>
                          <div className="rounded-full overflow-hidden flex items-center justify-center"
                            style={{
                              width: size, height: size,
                              border: `3px solid ${stageColor}`,
                              backgroundColor: 'rgba(255,255,255,0.9)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                            }}>
                            {store.google_photo_url ? (
                              <img src={store.google_photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm"
                                style={{ backgroundColor: stageColor }}>
                                {store.name.charAt(0)}
                              </div>
                            )}
                          </div>
                        </div>
                      </OverlayView>
                    );
                  })}

                  {/* Search results - circular photo markers with blue border */}
                  {searchResults.filter(p => p.latitude && p.longitude).map((place) => {
                    const size = 40;
                    return (
                      <OverlayView
                        key={place.place_id}
                        position={{ lat: place.latitude, lng: place.longitude }}
                        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                      >
                        <div
                          className="cursor-pointer"
                          style={{ width: size, height: size, marginLeft: -size/2, marginTop: -size/2 }}
                          onClick={() => addStore(place)}
                          title={`${place.name} – Klicken zum Hinzufügen`}
                        >
                          <div className="rounded-full overflow-hidden flex items-center justify-center"
                            style={{
                              width: size, height: size,
                              border: '3px solid hsl(220, 90%, 50%)',
                              backgroundColor: 'rgba(255,255,255,0.9)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                            }}>
                            {place.photo_reference ? (
                              <img
                                src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=80&photo_reference=${place.photo_reference}&key=${apiKey}`}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-sm"
                                style={{ backgroundColor: 'hsl(220, 90%, 50%)', color: 'white' }}>
                                {place.name.charAt(0)}
                              </div>
                            )}
                          </div>
                        </div>
                      </OverlayView>
                    );
                  })}

                  {/* Manual pin */}
                  {manualLatLng && (
                    <OverlayView
                      position={manualLatLng}
                      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                    >
                      <div className="transform -translate-x-1/2 -translate-y-full">
                        <div className="bg-emerald-500 text-white rounded-full h-8 w-8 flex items-center justify-center shadow-lg border-2 border-background animate-bounce">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-emerald-500 mx-auto -mt-0.5" />
                      </div>
                    </OverlayView>
                  )}

                  {/* Highlighted place from name search */}
                  {highlightedPlace && highlightedPlace.latitude && highlightedPlace.longitude && (
                    <OverlayView
                      position={{ lat: highlightedPlace.latitude, lng: highlightedPlace.longitude }}
                      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                    >
                      <div className="transform -translate-x-1/2 -translate-y-full">
                        <div className="bg-primary text-primary-foreground rounded-full h-10 w-10 flex items-center justify-center shadow-xl border-2 border-background animate-bounce ring-4 ring-primary/30">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-primary mx-auto -mt-0.5" />
                      </div>
                    </OverlayView>
                  )}
                </GoogleMap>

                {/* Manual add bar */}
                {manualAddMode ? (
                  <div className="absolute top-3 left-3 right-3 bg-card/95 backdrop-blur rounded-xl shadow-lg border p-3 space-y-2">
                    <p className="text-xs font-medium">📍 Klicke auf die Karte, um einen Standort zu wählen</p>
                    <Input
                      placeholder="Geschäftsname..."
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs" onClick={addManualStore} disabled={!manualName.trim() || !manualLatLng}>
                        <Plus className="h-3 w-3 mr-1" /> Hinzufügen
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setManualAddMode(false); setManualLatLng(null); setManualName(''); }}>
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-3 right-14 h-8 text-xs shadow-md"
                    onClick={() => setManualAddMode(true)}
                  >
                    <MapPin className="h-3.5 w-3.5 mr-1" /> Manuell hinzufügen
                  </Button>
                )}

                {/* Pin search mode bar */}
                {pinSearchMode && (
                  <div className="absolute top-3 left-3 right-3 bg-card/95 backdrop-blur rounded-xl shadow-lg border p-3 space-y-2">
                    <p className="text-xs font-medium">
                      📍 {searchPin
                        ? `Pin gesetzt – Umkreis ${(radius / 1000).toFixed(1)} km. Du kannst den Pin verschieben oder direkt suchen.`
                        : 'Klicke auf die Karte, um den Suchmittelpunkt zu setzen.'}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={searchPlaces}
                        disabled={!searchPin || searching}
                      >
                        {searching ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Search className="h-3 w-3 mr-1" />}
                        In Umkreis suchen
                      </Button>
                      {searchPin && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => { setSearchPin(null); setSearchCenter(null); }}
                        >
                          Pin entfernen
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setPinSearchMode(false)}
                      >
                        Schließen
                      </Button>
                    </div>
                  </div>
                )}

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
              </>
            )}
          </CardContent>
        </Card>

        {/* Right side: Results + Saved */}
        <div className="space-y-4 overflow-y-auto" style={{ maxHeight: '600px' }}>
          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Search className="h-4 w-4" />
                Suchergebnisse ({searchResults.length})
              </h3>
              <div className="space-y-2">
                {searchResults.map((place) => (
                  <Card key={place.place_id} className="overflow-hidden">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{place.name}</p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" /> {place.address}
                        </p>
                        <RatingStars rating={place.rating} />
                      </div>
                      <Button size="sm" className="shrink-0 h-8 text-xs" onClick={() => addStore(place)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Hinzufügen
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Saved stores */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Meine Stores ({savedStores.length})
            </h3>
            {savedStores.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Noch keine Stores gespeichert</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {savedStores.map((store) => (
                  <Card key={store.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-start gap-3">
                        {store.google_photo_url ? (
                          <img src={store.google_photo_url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm truncate">{store.name}</p>
                            {store.industry && <Badge variant="secondary" className="text-[10px] h-4 shrink-0">{store.industry}</Badge>}
                          </div>
                          <RatingStars rating={store.google_rating} />
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteStore(store.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {store.contact_person && (
                        <p className="text-xs flex items-center gap-1.5"><User className="h-3 w-3 text-muted-foreground" /> {store.contact_person}</p>
                      )}
                      {store.address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {store.address}</p>
                      )}
                      {store.phone && (
                        <p className="text-xs flex items-center gap-1.5"><Phone className="h-3 w-3 text-muted-foreground" /> <a href={`tel:${store.phone}`} className="hover:underline text-primary">{store.phone}</a></p>
                      )}
                      {store.ai_summary && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 bg-muted/50 rounded-md px-2 py-1">{store.ai_summary}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StoreFinder() {
  const { apiKey, loading } = useGoogleMapsApiKey();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        <div className="text-center">
          <MapPin className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
          <p>Google Maps API-Key nicht konfiguriert</p>
        </div>
      </div>
    );
  }

  return <StoreFinderContent apiKey={apiKey} />;
}

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Search, RefreshCw, Plus, Phone, MapPin, Send, Navigation } from "lucide-react";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useGoogleMapsApiKey } from "@/hooks/useGoogleMapsApiKey";
import { GoogleMap, useJsApiLoader, OverlayView } from "@react-google-maps/api";

const LIBRARIES: ('places')[] = ['places'];

interface Customer {
  id: string;
  name: string;
  industry: string | null;
  street: string | null;
  house_number: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  created_at: string;
  active: boolean;
  logo_url: string | null;
  status: string | null;
  latitude: number | null;
  longitude: number | null;
}

const defaultCenter = { lat: 48.137154, lng: 11.576124 };

const CustomerMarker = ({ customer, isSelected, onClick }: { customer: Customer; isSelected: boolean; onClick: () => void }) => {
  const size = isSelected ? 52 : 44;
  return (
    <div onClick={onClick} className="cursor-pointer transform transition-transform hover:scale-110"
      style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}>
      <div className="rounded-full overflow-hidden flex items-center justify-center"
        style={{
          width: size, height: size,
          border: `3px solid hsl(262, 55%, 45%)`,
          backgroundColor: 'rgba(255,255,255,0.9)',
          boxShadow: isSelected ? '0 0 0 3px hsla(262, 55%, 45%, 0.3)' : '0 2px 8px rgba(0,0,0,0.2)',
        }}>
        {customer.logo_url ? (
          <img src={customer.logo_url} alt={customer.name} className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: 'hsl(262, 55%, 45%)' }}>
            {customer.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
};

const Customers = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, user } = useAuth();
  const isPartner = role === 'partner' || (role !== 'admin' && location.pathname.startsWith('/vertriebler'));
  const basePath = isPartner ? '/vertriebler' : '/admin';
  const { apiKey, loading: apiKeyLoading } = useGoogleMapsApiKey();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_desc");
  const [activeTab, setActiveTab] = useState("alle");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Message dialog
  const [messageCustomer, setMessageCustomer] = useState<Customer | null>(null);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
    libraries: LIBRARIES,
  });

  const loadCustomers = async () => {
    try {
      setLoading(true);

      if (isPartner && user) {
        // Sales reps: only show customers they closed (via customer_subscriptions.created_by)
        const { data: subs, error: subsError } = await supabase
          .from("customer_subscriptions")
          .select("customer_id")
          .eq("created_by", user.id);

        if (subsError) throw subsError;

        const customerIds = [...new Set((subs || []).map(s => s.customer_id))];
        if (customerIds.length === 0) {
          setCustomers([]);
          return;
        }

        const { data, error } = await supabase
          .from("customers")
          .select("id, name, industry, street, house_number, postal_code, city, phone, created_at, active, logo_url, status, latitude, longitude")
          .in("id", customerIds)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setCustomers((data as Customer[]) || []);
      } else {
        // Admin: show all customers
        const { data, error } = await supabase
          .from("customers")
          .select("id, name, industry, street, house_number, postal_code, city, phone, created_at, active, logo_url, status, latitude, longitude")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setCustomers((data as Customer[]) || []);
      }
    } catch (error: any) {
      toast.error("Fehler beim Laden der Kunden");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCustomers(); }, []);
  useEffect(() => { applyFilters(); }, [customers, searchTerm, categoryFilter, sortBy, activeTab]);

  // Fit map bounds to customers
  useEffect(() => {
    if (!map || !customers.length) return;
    const withCoords = customers.filter(c => c.latitude && c.longitude);
    if (withCoords.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    withCoords.forEach(c => bounds.extend({ lat: c.latitude!, lng: c.longitude! }));
    map.fitBounds(bounds, 60);
  }, [map, customers]);

  const applyFilters = () => {
    let filtered = [...customers];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    switch (activeTab) {
      case "aktiv": filtered = filtered.filter((c) => c.active); break;
      case "inaktiv": filtered = filtered.filter((c) => !c.active); break;
      case "neu": filtered = filtered.filter((c) => new Date(c.created_at) >= sevenDaysAgo); break;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((c) =>
        c.name?.toLowerCase().includes(term) || c.city?.toLowerCase().includes(term) ||
        c.industry?.toLowerCase().includes(term) || c.phone?.includes(term)
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((c) => c.industry === categoryFilter);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "created_desc": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "created_asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name_asc": return (a.name || "").localeCompare(b.name || "");
        case "name_desc": return (b.name || "").localeCompare(a.name || "");
        default: return 0;
      }
    });

    setFilteredCustomers(filtered);
  };

  const categories = [...new Set(customers.map((c) => c.industry).filter(Boolean))];

  const getAddress = (customer: Customer) => {
    const parts = [customer.postal_code, customer.city].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "—";
  };

  const getStatusBadge = (customer: Customer) => {
    if (customer.status === "paused") return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Pausiert</Badge>;
    if (customer.status === "canceled" || customer.status === "past_due") return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{customer.status === "past_due" ? "Überfällig" : "Gekündigt"}</Badge>;
    if (customer.active) return <Badge className="bg-green-500/90 text-[10px] px-1.5 py-0">Aktiv</Badge>;
    return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Inaktiv</Badge>;
  };

  const handleSendMessage = async () => {
    if (!messageCustomer || !messageSubject.trim() || !messageBody.trim()) {
      toast.error("Bitte Betreff und Nachricht ausfüllen");
      return;
    }
    setSendingMessage(true);
    try {
      const { error } = await supabase.from("admin_merchant_messages" as any).insert({
        customer_id: messageCustomer.id, subject: messageSubject.trim(), body: messageBody.trim(),
      } as any);
      if (error) throw error;
      toast.success("Nachricht gesendet");
      setMessageCustomer(null); setMessageSubject(""); setMessageBody("");
    } catch (e: any) {
      toast.error("Fehler beim Senden"); console.error(e);
    } finally { setSendingMessage(false); }
  };

  const handleFlyToCustomer = (customer: Customer) => {
    if (customer.latitude && customer.longitude && map) {
      map.panTo({ lat: customer.latitude, lng: customer.longitude });
      map.setZoom(15);
      setSelectedCustomerId(customer.id);
    }
  };

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => { setMap(mapInstance); }, []);

  const activeCount = customers.filter((c) => c.active).length;
  const inactiveCount = customers.filter((c) => !c.active).length;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const newCount = customers.filter((c) => new Date(c.created_at) >= sevenDaysAgo).length;
  const customersWithCoords = customers.filter(c => c.latitude && c.longitude);

  return (
    <div className="flex h-[calc(100vh-3rem)] -m-6">
      {/* LEFT: Map */}
      <div className="flex-1 relative">
        {apiKeyLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">Karte wird geladen…</div>
        ) : !apiKey ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MapPin className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
              <p>Google Maps API-Key nicht konfiguriert</p>
            </div>
          </div>
        ) : isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={defaultCenter}
            zoom={7}
            onLoad={onMapLoad}
            options={{ disableDefaultUI: false, zoomControl: true, mapTypeControl: false, streetViewControl: false, fullscreenControl: true }}
          >
            {customersWithCoords.map((customer) => (
              <OverlayView key={customer.id} position={{ lat: customer.latitude!, lng: customer.longitude! }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                <CustomerMarker
                  customer={customer}
                  isSelected={selectedCustomerId === customer.id}
                  onClick={() => { setSelectedCustomerId(customer.id); }}
                />
              </OverlayView>
            ))}
          </GoogleMap>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">Karte wird geladen…</div>
        )}
      </div>

      {/* RIGHT: Customer List */}
      <div className="w-[520px] border-l bg-background overflow-y-auto flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg font-semibold">Meine Kunden</h1>
              <p className="text-xs text-muted-foreground">{filteredCustomers.length} von {customers.length} Kunden</p>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" onClick={loadCustomers} className="h-8">
                <RefreshCw className="w-3 h-3" />
              </Button>
              <Button size="sm" onClick={() => navigate("/admin/checkout")} className="h-8">
                <Plus className="w-3 h-3 mr-1" /> Neu
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white border h-8">
              <TabsTrigger value="alle" className="text-xs h-6">Alle ({customers.length})</TabsTrigger>
              <TabsTrigger value="aktiv" className="text-xs h-6">Aktiv ({activeCount})</TabsTrigger>
              <TabsTrigger value="inaktiv" className="text-xs h-6">Inaktiv ({inactiveCount})</TabsTrigger>
              <TabsTrigger value="neu" className="text-xs h-6">Neu ({newCount})</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-1.5 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Suchen..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-8 pl-7 text-sm" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="Kategorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                {categories.map((cat) => (<SelectItem key={cat} value={cat!}>{cat}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Customer rows */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Laden...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              {customers.length === 0 ? "Noch keine Kunden" : "Keine Ergebnisse"}
            </div>
          ) : (
            <div className="divide-y">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors ${selectedCustomerId === customer.id ? 'bg-muted/70' : ''}`}
                  onClick={() => navigate(`/admin/customers/${customer.id}`)}
                >
                  <div className="w-9 h-9 rounded-lg overflow-hidden border border-border/50 bg-muted/30 flex items-center justify-center shrink-0">
                    {customer.logo_url ? (
                      <img src={customer.logo_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">{customer.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{customer.name}</span>
                      {getStatusBadge(customer)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {customer.industry && <span>{customer.industry}</span>}
                      <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{getAddress(customer)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {customer.latitude && customer.longitude && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Auf Karte zeigen"
                        onClick={(e) => { e.stopPropagation(); handleFlyToCustomer(customer); }}>
                        <Navigation className="h-3 w-3" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Nachricht senden"
                      onClick={(e) => { e.stopPropagation(); setMessageCustomer(customer); }}>
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Send Message Dialog */}
      <Dialog open={!!messageCustomer} onOpenChange={(open) => !open && setMessageCustomer(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nachricht an {messageCustomer?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Betreff</Label><Input value={messageSubject} onChange={(e) => setMessageSubject(e.target.value)} placeholder="Betreff..." /></div>
            <div><Label className="text-xs">Nachricht</Label><Textarea value={messageBody} onChange={(e) => setMessageBody(e.target.value)} placeholder="Nachricht eingeben..." rows={4} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageCustomer(null)}>Abbrechen</Button>
            <Button onClick={handleSendMessage} disabled={sendingMessage}><Send className="w-3 h-3 mr-1" />{sendingMessage ? "Senden..." : "Senden"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;

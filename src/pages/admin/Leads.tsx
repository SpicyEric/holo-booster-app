import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Store, MapPin, User, Phone, Search, ArrowUpDown, Mail, ChevronRight } from 'lucide-react';

interface UnifiedContact {
  id: string;
  shop_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  street: string | null;
  house_number: string | null;
  postal_code: string | null;
  city: string | null;
  industry: string | null;
  status: string;
  source: 'pipeline' | 'customer';
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; textColor: string; bgLight: string }> = {
  neu: { label: 'Neu', color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
  new: { label: 'Neu', color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
  kontaktiert: { label: 'Kontaktiert', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  contacted: { label: 'Kontaktiert', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  terminiert: { label: 'Termin', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50' },
  appointment: { label: 'Termin', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50' },
  standby: { label: 'Standby', color: 'bg-cyan-500', textColor: 'text-cyan-700', bgLight: 'bg-cyan-50' },
  gewonnen: { label: 'Gewonnen', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50' },
  won: { label: 'Gewonnen', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50' },
  verloren: { label: 'Verloren', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
  lost: { label: 'Verloren', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
  active: { label: 'Aktiv', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50' },
  inactive: { label: 'Inaktiv', color: 'bg-gray-400', textColor: 'text-gray-600', bgLight: 'bg-gray-50' },
  paused: { label: 'Pausiert', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  cancelled: { label: 'Gekündigt', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
};

type SortField = 'shop_name' | 'postal_code' | 'phone' | 'status' | 'created_at' | 'city';

export default function Leads() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<UnifiedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [plzFilter, setPlzFilter] = useState('');
  const [radiusKm, setRadiusKm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('shop_name');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => { fetchContacts(); }, []);

  const fetchContacts = async () => {
    try {
      const [storesRes, customersRes] = await Promise.all([
        supabase.from('discovered_stores').select('id, name, contact_person, phone, email, street, house_number, postal_code, city, industry, status, created_at'),
        supabase.from('customers').select('id, name, contact_person, phone, email, street, house_number, postal_code, city, industry, status, created_at'),
      ]);
      if (storesRes.error) throw storesRes.error;
      if (customersRes.error) throw customersRes.error;

      const all: UnifiedContact[] = [
        ...(storesRes.data || []).map(s => ({ id: s.id, shop_name: s.name, contact_person: s.contact_person, phone: s.phone, email: s.email, street: s.street, house_number: s.house_number, postal_code: s.postal_code, city: s.city, industry: s.industry, status: s.status, source: 'pipeline' as const, created_at: s.created_at })),
        ...(customersRes.data || []).map(c => ({ id: c.id, shop_name: c.name, contact_person: c.contact_person, phone: c.phone, email: c.email, street: c.street, house_number: c.house_number, postal_code: c.postal_code, city: c.city, industry: c.industry, status: c.status || 'active', source: 'customer' as const, created_at: c.created_at })),
      ];
      setContacts(all);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Fehler beim Laden der Kontakte');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...contacts];
    if (sourceFilter !== 'all') result = result.filter(l => l.source === sourceFilter);
    if (statusFilter !== 'all') result = result.filter(l => l.status === statusFilter);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(l => l.shop_name.toLowerCase().includes(lower) || l.contact_person?.toLowerCase().includes(lower) || l.phone?.toLowerCase().includes(lower) || l.email?.toLowerCase().includes(lower) || l.city?.toLowerCase().includes(lower));
    }
    if (plzFilter) {
      if (radiusKm && !isNaN(Number(radiusKm))) {
        const km = Number(radiusKm);
        let prefixLen = 5;
        if (km >= 50) prefixLen = 2; else if (km >= 20) prefixLen = 3; else if (km >= 10) prefixLen = 4;
        result = result.filter(l => l.postal_code?.startsWith(plzFilter.substring(0, prefixLen)));
      } else {
        result = result.filter(l => l.postal_code === plzFilter);
      }
    }
    result.sort((a, b) => {
      let valA = (a[sortField] || '') as string;
      let valB = (b[sortField] || '') as string;
      if (sortField === 'status') { valA = STATUS_MAP[valA]?.label || valA; valB = STATUS_MAP[valB]?.label || valB; }
      const cmp = valA.localeCompare(valB, 'de');
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [contacts, statusFilter, sourceFilter, searchTerm, plzFilter, radiusKm, sortField, sortAsc]);

  const uniqueStatuses = useMemo(() => Array.from(new Set(contacts.map(c => c.status))), [contacts]);

  const formatAddress = (l: UnifiedContact) => {
    const parts = [];
    if (l.street) parts.push(l.street + (l.house_number ? ' ' + l.house_number : ''));
    if (l.postal_code || l.city) parts.push([l.postal_code, l.city].filter(Boolean).join(' '));
    return parts.join(', ') || 'Keine Adresse';
  };

  const getStage = (status: string) => STATUS_MAP[status] || { label: status, color: 'bg-gray-400', textColor: 'text-gray-600', bgLight: 'bg-gray-50' };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Kontakte</h1>
        <p className="text-xs text-muted-foreground">{contacts.length} Kontakte insgesamt</p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Name, Kontakt, Stadt..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="PLZ" value={plzFilter} onChange={e => setPlzFilter(e.target.value)} className="w-24 h-8 text-sm" maxLength={5} />
          {plzFilter && (
            <Select value={radiusKm || 'exact'} onValueChange={v => setRadiusKm(v === 'exact' ? '' : v)}>
              <SelectTrigger className="w-[100px] h-8 text-sm"><SelectValue placeholder="Umkreis" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="exact">Exakt</SelectItem>
                <SelectItem value="10">10 km</SelectItem>
                <SelectItem value="20">20 km</SelectItem>
                <SelectItem value="50">50 km</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[130px] h-8 text-sm"><SelectValue placeholder="Quelle" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Quellen</SelectItem>
            <SelectItem value="customer">Kunden</SelectItem>
            <SelectItem value="pipeline">Pipeline</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-8 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {uniqueStatuses.map(s => <SelectItem key={s} value={s}>{getStage(s).label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortField} onValueChange={v => { setSortField(v as SortField); setSortAsc(true); }}>
          <SelectTrigger className="w-[130px] h-8 text-sm"><SelectValue placeholder="Sortieren" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="shop_name">Name</SelectItem>
            <SelectItem value="postal_code">PLZ</SelectItem>
            <SelectItem value="city">Stadt</SelectItem>
            <SelectItem value="phone">Telefon</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="created_at">Datum</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSortAsc(!sortAsc)} title={sortAsc ? 'Aufsteigend' : 'Absteigend'}>
          <ArrowUpDown className="w-3.5 h-3.5" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">{filteredAndSorted.length} von {contacts.length} Kontakten</p>

      {/* Cards Grid */}
      {filteredAndSorted.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Keine Kontakte gefunden</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredAndSorted.map(l => {
            const stage = getStage(l.status);
            return (
              <Card
                key={`${l.source}-${l.id}`}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow border-border/40"
                onClick={() => {
                  if (l.source === 'customer') navigate(`/admin/customers/${l.id}`);
                  else navigate('/admin/pipeline');
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${stage.bgLight}`}>
                      <Store className={`w-4 h-4 ${stage.textColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{l.shop_name}</p>
                      {l.industry && <p className="text-[10px] text-muted-foreground">{l.industry}</p>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{formatAddress(l)}</span>
                  </div>
                  {l.contact_person && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <User className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{l.contact_person}</span>
                    </div>
                  )}
                  {l.phone && (
                    <a href={`tel:${l.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                      <Phone className="w-3 h-3 shrink-0" />
                      <span className="truncate">{l.phone}</span>
                    </a>
                  )}
                  {l.email && (
                    <a href={`mailto:${l.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                      <Mail className="w-3 h-3 shrink-0" />
                      <span className="truncate">{l.email}</span>
                    </a>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Badge className={`${stage.color} text-white text-[10px] px-2`}>{stage.label}</Badge>
                    <Badge variant="outline" className={`text-[10px] px-1.5 ${l.source === 'customer' ? 'border-green-400 text-green-600' : 'border-blue-400 text-blue-600'}`}>
                      {l.source === 'customer' ? 'Kunde' : 'Pipeline'}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(l.created_at), 'dd.MM.yy', { locale: de })}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

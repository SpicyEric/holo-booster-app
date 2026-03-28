import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Store, MapPin, User, Phone, Calendar, Search, ArrowUpDown, Mail } from 'lucide-react';

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

const PIPELINE_STATUS_MAP: Record<string, { label: string; color: string }> = {
  neu: { label: 'Neu', color: 'bg-blue-500' },
  new: { label: 'Neu', color: 'bg-blue-500' },
  kontaktiert: { label: 'Kontaktiert', color: 'bg-yellow-500' },
  contacted: { label: 'Kontaktiert', color: 'bg-yellow-500' },
  terminiert: { label: 'Termin', color: 'bg-orange-500' },
  appointment: { label: 'Termin', color: 'bg-orange-500' },
  standby: { label: 'Standby', color: 'bg-cyan-500' },
  gewonnen: { label: 'Gewonnen', color: 'bg-green-500' },
  won: { label: 'Gewonnen', color: 'bg-green-500' },
  verloren: { label: 'Verloren', color: 'bg-red-500' },
  lost: { label: 'Verloren', color: 'bg-red-500' },
  active: { label: 'Aktiv', color: 'bg-green-500' },
  inactive: { label: 'Inaktiv', color: 'bg-gray-500' },
  paused: { label: 'Pausiert', color: 'bg-yellow-500' },
  cancelled: { label: 'Gekündigt', color: 'bg-red-500' },
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

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const [storesRes, customersRes] = await Promise.all([
        supabase.from('discovered_stores').select('id, name, contact_person, phone, email, street, house_number, postal_code, city, industry, status, created_at'),
        supabase.from('customers').select('id, name, contact_person, phone, email, street, house_number, postal_code, city, industry, status, created_at'),
      ]);

      if (storesRes.error) throw storesRes.error;
      if (customersRes.error) throw customersRes.error;

      const storeContacts: UnifiedContact[] = (storesRes.data || []).map(s => ({
        id: s.id,
        shop_name: s.name,
        contact_person: s.contact_person,
        phone: s.phone,
        email: s.email,
        street: s.street,
        house_number: s.house_number,
        postal_code: s.postal_code,
        city: s.city,
        industry: s.industry,
        status: s.status,
        source: 'pipeline' as const,
        created_at: s.created_at,
      }));

      const customerContacts: UnifiedContact[] = (customersRes.data || []).map(c => ({
        id: c.id,
        shop_name: c.name,
        contact_person: c.contact_person,
        phone: c.phone,
        email: c.email,
        street: c.street,
        house_number: c.house_number,
        postal_code: c.postal_code,
        city: c.city,
        industry: c.industry,
        status: c.status || 'active',
        source: 'customer' as const,
        created_at: c.created_at,
      }));

      setContacts([...storeContacts, ...customerContacts]);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Fehler beim Laden der Kontakte');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...contacts];

    if (sourceFilter !== 'all') {
      result = result.filter(l => l.source === sourceFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter(l => l.status === statusFilter);
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(l =>
        l.shop_name.toLowerCase().includes(lower) ||
        l.contact_person?.toLowerCase().includes(lower) ||
        l.phone?.toLowerCase().includes(lower) ||
        l.email?.toLowerCase().includes(lower) ||
        l.city?.toLowerCase().includes(lower)
      );
    }

    if (plzFilter) {
      if (radiusKm && !isNaN(Number(radiusKm))) {
        const km = Number(radiusKm);
        let prefixLen = 5;
        if (km >= 50) prefixLen = 2;
        else if (km >= 20) prefixLen = 3;
        else if (km >= 10) prefixLen = 4;
        const prefix = plzFilter.substring(0, prefixLen);
        result = result.filter(l => l.postal_code?.startsWith(prefix));
      } else {
        result = result.filter(l => l.postal_code === plzFilter);
      }
    }

    result.sort((a, b) => {
      let valA = (a[sortField] || '') as string;
      let valB = (b[sortField] || '') as string;
      if (sortField === 'status') {
        valA = PIPELINE_STATUS_MAP[valA]?.label || valA;
        valB = PIPELINE_STATUS_MAP[valB]?.label || valB;
      }
      const cmp = valA.localeCompare(valB, 'de');
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [contacts, statusFilter, sourceFilter, searchTerm, plzFilter, radiusKm, sortField, sortAsc]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const formatAddress = (l: UnifiedContact) => {
    const parts = [];
    if (l.street) parts.push(l.street + (l.house_number ? ' ' + l.house_number : ''));
    if (l.postal_code || l.city) parts.push([l.postal_code, l.city].filter(Boolean).join(' '));
    return parts.join(', ') || '—';
  };

  const getStatusBadge = (status: string) => {
    const s = PIPELINE_STATUS_MAP[status];
    if (s) return <Badge className={s.color}>{s.label}</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const uniqueStatuses = useMemo(() => {
    const set = new Set(contacts.map(c => c.status));
    return Array.from(set);
  }, [contacts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kontakte</h1>
        <p className="text-muted-foreground">Kunden & Pipeline-Kontakte im Überblick</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Name, Kontakt, Stadt..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>

        <div className="flex items-center gap-2">
          <Input placeholder="PLZ" value={plzFilter} onChange={e => setPlzFilter(e.target.value)} className="w-24" maxLength={5} />
          {plzFilter && (
            <Select value={radiusKm || 'exact'} onValueChange={v => setRadiusKm(v === 'exact' ? '' : v)}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="Umkreis" /></SelectTrigger>
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
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Quelle" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Quellen</SelectItem>
            <SelectItem value="customer">Kunden</SelectItem>
            <SelectItem value="pipeline">Pipeline</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {uniqueStatuses.map(s => (
              <SelectItem key={s} value={s}>{PIPELINE_STATUS_MAP[s]?.label || s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortField} onValueChange={v => { setSortField(v as SortField); setSortAsc(true); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Sortieren" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="shop_name">Name</SelectItem>
            <SelectItem value="postal_code">PLZ</SelectItem>
            <SelectItem value="city">Stadt</SelectItem>
            <SelectItem value="phone">Telefon</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="created_at">Datum</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" size="icon" onClick={() => setSortAsc(!sortAsc)} title={sortAsc ? 'Aufsteigend' : 'Absteigend'}>
          <ArrowUpDown className="w-4 h-4" />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{filteredAndSorted.length} von {contacts.length} Kontakten</p>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left p-4 font-medium cursor-pointer select-none" onClick={() => toggleSort('shop_name')}>
                  <span className="flex items-center gap-1">Shop {sortField === 'shop_name' && <ArrowUpDown className="w-3 h-3" />}</span>
                </th>
                <th className="text-left p-4 font-medium">Adresse</th>
                <th className="text-left p-4 font-medium">Kontakt</th>
                <th className="text-left p-4 font-medium cursor-pointer select-none" onClick={() => toggleSort('status')}>
                  <span className="flex items-center gap-1">Status {sortField === 'status' && <ArrowUpDown className="w-3 h-3" />}</span>
                </th>
                <th className="text-left p-4 font-medium">Quelle</th>
                <th className="text-left p-4 font-medium cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                  <span className="flex items-center gap-1">Datum {sortField === 'created_at' && <ArrowUpDown className="w-3 h-3" />}</span>
                </th>
                <th className="text-right p-4 font-medium">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Keine Kontakte gefunden</td></tr>
              ) : (
                filteredAndSorted.map(l => (
                  <tr key={`${l.source}-${l.id}`} className="border-b hover:bg-muted/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Store className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{l.shop_name}</p>
                          {l.industry && <p className="text-xs text-muted-foreground">{l.industry}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{formatAddress(l)}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-0.5">
                        {l.contact_person && (
                          <div className="flex items-center gap-1.5 text-sm"><User className="h-3.5 w-3.5 text-muted-foreground" />{l.contact_person}</div>
                        )}
                        {l.phone && (
                          <a href={`tel:${l.phone}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline"><Phone className="h-3.5 w-3.5" />{l.phone}</a>
                        )}
                        {l.email && (
                          <a href={`mailto:${l.email}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline"><Mail className="h-3.5 w-3.5" />{l.email}</a>
                        )}
                      </div>
                    </td>
                    <td className="p-4">{getStatusBadge(l.status)}</td>
                    <td className="p-4">
                      <Badge variant="outline" className={l.source === 'customer' ? 'border-green-500 text-green-600' : 'border-blue-500 text-blue-600'}>
                        {l.source === 'customer' ? 'Kunde' : 'Pipeline'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(l.created_at), 'dd.MM.yyyy', { locale: de })}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="outline" size="sm" onClick={() => {
                        if (l.source === 'customer') navigate(`/admin/customers/${l.id}`);
                        else navigate('/admin/pipeline');
                      }}>
                        {l.source === 'customer' ? 'Details' : 'Pipeline'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

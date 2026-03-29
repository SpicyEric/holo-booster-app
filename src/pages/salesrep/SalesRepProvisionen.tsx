import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Euro, TrendingUp, Clock, CheckCircle, Users, Search, Filter } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Commission {
  id: string;
  amount_cents: number;
  discount_cents: number;
  commission_type: string | null;
  status: string | null;
  currency: string | null;
  created_at: string | null;
  available_at: string | null;
  customer_id: string | null;
  customer_name: string | null;
}

interface SalesRepProfile {
  is_small_business: boolean;
}

export default function SalesRepProvisionen() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SalesRepProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      try {
        const [commissionsRes, profileRes] = await Promise.all([
          supabase
            .from('commissions')
            .select('*')
            .eq('promoter_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('sales_rep_profiles')
            .select('is_small_business')
            .eq('user_id', user.id)
            .maybeSingle(),
        ]);

        if (commissionsRes.error) throw commissionsRes.error;
        setCommissions((commissionsRes.data || []) as Commission[]);
        if (profileRes.data) setProfile(profileRes.data as SalesRepProfile);
      } catch (err) {
        console.error('Error fetching commissions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const isVATLiable = profile ? !profile.is_small_business : false;
  const now = new Date();

  // Compute real-time statuses based on available_at
  const computedCommissions = useMemo(() => {
    return commissions.map(c => {
      let effectiveStatus = c.status;
      if (c.status === 'pending' && c.available_at && new Date(c.available_at) <= now) {
        effectiveStatus = 'available';
      }
      return { ...c, effectiveStatus };
    });
  }, [commissions, now]);

  // Summary calculations
  const pendingTotal = computedCommissions
    .filter(c => c.effectiveStatus === 'pending')
    .reduce((sum, c) => sum + (c.amount_cents - (c.discount_cents || 0)), 0);

  const availableTotal = computedCommissions
    .filter(c => c.effectiveStatus === 'available')
    .reduce((sum, c) => sum + (c.amount_cents - (c.discount_cents || 0)), 0);

  const paidTotal = computedCommissions
    .filter(c => c.effectiveStatus === 'paid')
    .reduce((sum, c) => sum + (c.amount_cents - (c.discount_cents || 0)), 0);

  // Active customers (unique customer_ids with recurring commissions)
  const activeCustomerIds = new Set(
    computedCommissions
      .filter(c => c.commission_type === 'recurring' && c.effectiveStatus !== 'paid')
      .map(c => c.customer_id)
      .filter(Boolean)
  );
  const activeCustomerCount = activeCustomerIds.size;
  const monthlyIncome = activeCustomerCount * 1200; // 12€ per customer in cents

  // Filtering
  const filteredCommissions = useMemo(() => {
    return computedCommissions.filter(c => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!(c.customer_name || '').toLowerCase().includes(q)) return false;
      }
      if (filterType !== 'all' && c.commission_type !== filterType) return false;
      if (filterStatus !== 'all' && c.effectiveStatus !== filterStatus) return false;
      return true;
    });
  }, [computedCommissions, searchQuery, filterType, filterStatus]);

  const formatCents = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');
  const formatBrutto = (netCents: number) => formatCents(Math.round(netCents * 1.19));

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'available': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Verfügbar</Badge>;
      case 'paid': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Ausbezahlt</Badge>;
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Vorgemerkt</Badge>;
      default: return <Badge variant="outline">{status || '—'}</Badge>;
    }
  };

  const getTypeLabel = (type: string | null) => {
    switch (type) {
      case 'initial': return 'Einmalprovision';
      case 'recurring': return 'Folgeprovision';
      default: return type || 'Provision';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Provisionen</h1>
        <p className="text-muted-foreground">Übersicht deiner Provisionen und Auszahlungen</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCents(pendingTotal)} €</p>
                {isVATLiable && <p className="text-xs text-muted-foreground">brutto: {formatBrutto(pendingTotal)} €</p>}
                <p className="text-xs text-muted-foreground mt-0.5">Vorgemerkt (14-Tage-Frist)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Euro className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCents(availableTotal)} €</p>
                {isVATLiable && <p className="text-xs text-muted-foreground">brutto: {formatBrutto(availableTotal)} €</p>}
                <p className="text-xs text-muted-foreground mt-0.5">Zur Auszahlung bereit</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCents(paidTotal)} €</p>
                {isVATLiable && <p className="text-xs text-muted-foreground">brutto: {formatBrutto(paidTotal)} €</p>}
                <p className="text-xs text-muted-foreground mt-0.5">Bereits ausbezahlt</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{activeCustomerCount} aktive Kunden</p>
                <p className="text-sm font-semibold text-green-600">
                  = {formatCents(monthlyIncome)} € / Monat
                  {isVATLiable && <span className="text-muted-foreground font-normal"> (brutto: {formatBrutto(monthlyIncome)} €)</span>}
                </p>
                {!isVATLiable && <p className="text-xs text-muted-foreground">Netto (Kleinunternehmer)</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provisionskonditionen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Euro className="w-4 h-4 text-primary" />
            Provisionsmodell
          </CardTitle>
          <CardDescription>Netto-Beträge{isVATLiable ? ', zzgl. 19 % MwSt.' : ' (Kleinunternehmerregelung)'}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium text-muted-foreground mb-1">Einmalprovision</p>
              <p className="text-2xl font-bold">50,00 €</p>
              {isVATLiable && <p className="text-sm text-muted-foreground">brutto: 59,50 €</p>}
              <p className="text-xs text-muted-foreground mt-2">Pro abgeschlossenem Kunden, verfügbar nach 14 Tagen</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium text-muted-foreground mb-1">Folgeprovision</p>
              <p className="text-2xl font-bold">12,00 € <span className="text-base font-normal">/ Monat</span></p>
              {isVATLiable && <p className="text-sm text-muted-foreground">brutto: 14,28 € / Monat</p>}
              <p className="text-xs text-muted-foreground mt-2">Monatlich, solange der Kunde aktiv ist</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commission History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provisionshistorie</CardTitle>
          <CardDescription>Detaillierte Auflistung aller Provisionen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Geschäft suchen..."
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Typ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                <SelectItem value="initial">Einmalprovision</SelectItem>
                <SelectItem value="recurring">Folgeprovision</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="pending">Vorgemerkt</SelectItem>
                <SelectItem value="available">Verfügbar</SelectItem>
                <SelectItem value="paid">Ausbezahlt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredCommissions.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Noch keine Provisionen vorhanden.</p>
              <p className="text-xs text-muted-foreground mt-1">Provisionen werden nach Kundenabschluss automatisch erfasst.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Geschäft</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead className="text-right">Netto</TableHead>
                    {isVATLiable && <TableHead className="text-right">Brutto</TableHead>}
                    {filteredCommissions.some(c => (c.discount_cents || 0) > 0) && (
                      <TableHead className="text-right">Rabatt</TableHead>
                    )}
                    <TableHead>Status</TableHead>
                    <TableHead>Verfügbar ab</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCommissions.map((c) => {
                    const netAmount = c.amount_cents - (c.discount_cents || 0);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {c.created_at ? format(new Date(c.created_at), 'dd.MM.yyyy', { locale: de }) : '—'}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{c.customer_name || '—'}</TableCell>
                        <TableCell className="text-sm">{getTypeLabel(c.commission_type)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCents(netAmount)} €</TableCell>
                        {isVATLiable && (
                          <TableCell className="text-right text-muted-foreground">{formatBrutto(netAmount)} €</TableCell>
                        )}
                        {filteredCommissions.some(cc => (cc.discount_cents || 0) > 0) && (
                          <TableCell className="text-right text-red-500">
                            {(c.discount_cents || 0) > 0 ? `-${formatCents(c.discount_cents || 0)} €` : '—'}
                          </TableCell>
                        )}
                        <TableCell>{getStatusBadge(c.effectiveStatus)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {c.effectiveStatus === 'pending' && c.available_at
                            ? format(new Date(c.available_at), 'dd.MM.yyyy', { locale: de })
                            : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

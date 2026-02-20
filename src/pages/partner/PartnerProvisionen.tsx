import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Euro, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Commission {
  id: string;
  amount_cents: number;
  commission_type: string | null;
  status: string | null;
  currency: string | null;
  created_at: string | null;
  customer_id: string | null;
}

export default function PartnerProvisionen() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchCommissions = async () => {
      try {
        const { data, error } = await supabase
          .from('commissions')
          .select('*')
          .eq('promoter_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCommissions(data || []);
      } catch (err) {
        console.error('Error fetching commissions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCommissions();
  }, [user?.id]);

  const totalAvailable = commissions
    .filter(c => c.status === 'available')
    .reduce((sum, c) => sum + c.amount_cents, 0);

  const totalPaid = commissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + c.amount_cents, 0);

  const totalPending = commissions
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + c.amount_cents, 0);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'available': return <Badge className="bg-green-100 text-green-800">Verfügbar</Badge>;
      case 'paid': return <Badge className="bg-blue-100 text-blue-800">Ausbezahlt</Badge>;
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800">Ausstehend</Badge>;
      default: return <Badge variant="outline">{status || '—'}</Badge>;
    }
  };

  const getTypLabel = (type: string | null) => {
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Euro className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(totalAvailable / 100).toFixed(2)} €</p>
                <p className="text-xs text-muted-foreground">Verfügbar</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <TrendingUp className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(totalPending / 100).toFixed(2)} €</p>
                <p className="text-xs text-muted-foreground">Ausstehend (Qualifizierung)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Euro className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(totalPaid / 100).toFixed(2)} €</p>
                <p className="text-xs text-muted-foreground">Bereits ausbezahlt</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provisions-Konditionen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Euro className="w-5 h-5 text-primary" />
            Provisionskonditionen
          </CardTitle>
          <CardDescription>Netto-Beträge, bei Umsatzsteuerpflicht zzgl. 19% MwSt.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paket</TableHead>
                <TableHead>Einmalprovision</TableHead>
                <TableHead>Folgeprovision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell><Badge variant="outline">Basic</Badge></TableCell>
                <TableCell className="font-semibold">80,00 €</TableCell>
                <TableCell className="font-semibold">7,00 € / Monat</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Badge variant="outline">Plus</Badge></TableCell>
                <TableCell className="font-semibold">100,00 €</TableCell>
                <TableCell className="font-semibold">9,00 € / Monat</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Badge variant="outline">Pro</Badge></TableCell>
                <TableCell className="font-semibold">120,00 €</TableCell>
                <TableCell className="font-semibold">12,00 € / Monat</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Commission History */}
      <Card>
        <CardHeader>
          <CardTitle>Provisionshistorie</CardTitle>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Noch keine Provisionen vorhanden.</p>
              <p className="text-xs text-muted-foreground mt-1">Provisionen werden nach Kundenabschluss automatisch erfasst.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Betrag</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">
                      {c.created_at ? format(new Date(c.created_at), 'dd.MM.yyyy', { locale: de }) : '—'}
                    </TableCell>
                    <TableCell className="text-sm">{getTypLabel(c.commission_type)}</TableCell>
                    <TableCell className="font-semibold">{(c.amount_cents / 100).toFixed(2)} €</TableCell>
                    <TableCell>{getStatusBadge(c.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

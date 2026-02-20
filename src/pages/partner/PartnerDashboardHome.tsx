import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Users, TrendingUp, Euro, Target, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

export default function PartnerDashboardHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalLeads: 0, converted: 0, inProgress: 0, totalCommission: 0 });
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    
    const fetchData = async () => {
      try {
        // Fetch leads
        const { data: leads } = await supabase
          .from('sales_leads')
          .select('*')
          .eq('partner_user_id', user.id)
          .order('created_at', { ascending: false });

        const allLeads = leads || [];
        const converted = allLeads.filter(l => l.status === 'converted').length;
        const inProgress = allLeads.filter(l => !['converted', 'lost'].includes(l.status)).length;

        // Fetch commissions
        const { data: commissions } = await supabase
          .from('commissions')
          .select('amount_cents')
          .eq('promoter_id', user.id);

        const totalCommission = (commissions || []).reduce((sum, c) => sum + (c.amount_cents || 0), 0);

        setStats({
          totalLeads: allLeads.length,
          converted,
          inProgress,
          totalCommission,
        });
        setRecentLeads(allLeads.slice(0, 5));
      } catch (err) {
        console.error('Error fetching partner data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      new: { label: 'Neu', className: 'bg-blue-100 text-blue-800' },
      contacted: { label: 'Kontaktiert', className: 'bg-yellow-100 text-yellow-800' },
      interested: { label: 'Interessiert', className: 'bg-green-100 text-green-800' },
      offer_sent: { label: 'Angebot', className: 'bg-purple-100 text-purple-800' },
      converted: { label: 'Abgeschlossen', className: 'bg-emerald-100 text-emerald-800' },
      lost: { label: 'Verloren', className: 'bg-gray-100 text-gray-600' },
    };
    const s = map[status] || { label: status, className: 'bg-gray-100 text-gray-600' };
    return <Badge className={s.className}>{s.label}</Badge>;
  };

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
        <h1 className="text-2xl font-bold">Vertriebler Dashboard</h1>
        <p className="text-muted-foreground">Deine Pipeline & Performance auf einen Blick</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalLeads}</p>
                <p className="text-xs text-muted-foreground">Leads gesamt</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">In Bearbeitung</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.converted}</p>
                <p className="text-xs text-muted-foreground">Abschlüsse</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Euro className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(stats.totalCommission / 100).toFixed(0)} €</p>
                <p className="text-xs text-muted-foreground">Provisionen</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Rate */}
      {stats.totalLeads > 0 && (
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="font-medium">Conversion Rate</span>
              </div>
              <span className="text-2xl font-bold text-primary">
                {Math.round((stats.converted / stats.totalLeads) * 100)}%
              </span>
            </div>
            <div className="mt-3 w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${(stats.converted / stats.totalLeads) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Leads */}
      <Card>
        <CardContent className="pt-5">
          <h3 className="font-semibold mb-4">Letzte Leads</h3>
          {recentLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Noch keine Leads erstellt. Leg los!
            </p>
          ) : (
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">{lead.shop_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {lead.city || 'Keine Stadt'} · {format(new Date(lead.created_at), 'dd.MM.yyyy', { locale: de })}
                    </p>
                  </div>
                  {getStatusBadge(lead.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

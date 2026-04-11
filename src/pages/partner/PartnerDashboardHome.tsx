import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Users, TrendingUp, Euro, Target, Clock, CalendarIcon, PhoneCall, AlertCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ScheduledActivity {
  id: string;
  lead_id: string;
  activity_type: string;
  title: string;
  scheduled_at: string;
  completed_at: string | null;
  lead_name?: string;
}

export default function PartnerDashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalLeads: 0, converted: 0, inProgress: 0, totalCommission: 0 });
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [upcomingActivities, setUpcomingActivities] = useState<ScheduledActivity[]>([]);
  const [overdueActivities, setOverdueActivities] = useState<ScheduledActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [contractWarning, setContractWarning] = useState<{ show: boolean; daysLeft: number }>({ show: false, daysLeft: 0 });

  useEffect(() => {
    if (!user?.id) return;
    const checkContract = async () => {
      const { data } = await supabase
        .from('sales_rep_profiles' as any)
        .select('contract_status, contract_deadline')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        const status = (data as any).contract_status;
        if (status === 'pending' && (data as any).contract_deadline) {
          const daysLeft = Math.max(0, Math.ceil((new Date((data as any).contract_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
          setContractWarning({ show: true, daysLeft });
        } else if (status === 'submitted') {
          setContractWarning({ show: true, daysLeft: -1 }); // -1 = submitted
        }
      }
    };
    checkContract();
  }, [user?.id]);

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

        setStats({ totalLeads: allLeads.length, converted, inProgress, totalCommission });
        setRecentLeads(allLeads.slice(0, 5));

        // Fetch scheduled activities
        const { data: activities } = await supabase
          .from('lead_scheduled_activities')
          .select('*')
          .eq('partner_user_id', user.id)
          .is('completed_at', null)
          .order('scheduled_at', { ascending: true });

        const now = new Date();
        const acts = (activities || []).map(a => {
          const lead = allLeads.find(l => l.id === a.lead_id);
          return { ...a, lead_name: lead?.shop_name || 'Unbekannt' };
        });

        setOverdueActivities(acts.filter(a => new Date(a.scheduled_at) < now));
        setUpcomingActivities(acts.filter(a => new Date(a.scheduled_at) >= now).slice(0, 5));
      } catch (err) {
        console.error('Error:', err);
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

  const completeActivity = async (id: string) => {
    await supabase.from('lead_scheduled_activities').update({ completed_at: new Date().toISOString() }).eq('id', id);
    setOverdueActivities(prev => prev.filter(a => a.id !== id));
    setUpcomingActivities(prev => prev.filter(a => a.id !== id));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {contractWarning.show && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Vertrag noch nicht eingereicht</p>
            <p className="text-sm text-destructive/80">
              Bitte lade deinen unterschriebenen Vertrag unter Einstellungen → Steuern & Vertrag hoch.
              Dein Account wird in <strong>{contractWarning.daysLeft} Tagen</strong> automatisch gelöscht, wenn kein Vertrag vorliegt.
            </p>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">Vertriebler Dashboard</h1>
        <p className="text-muted-foreground">Deine Pipeline & Performance auf einen Blick</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users, bg: 'bg-blue-100', color: 'text-blue-600', value: stats.totalLeads, label: 'Leads gesamt' },
          { icon: Clock, bg: 'bg-yellow-100', color: 'text-yellow-600', value: stats.inProgress, label: 'In Bearbeitung' },
          { icon: Target, bg: 'bg-green-100', color: 'text-green-600', value: stats.converted, label: 'Abschlüsse' },
          { icon: Euro, bg: 'bg-emerald-100', color: 'text-emerald-600', value: `${(stats.totalCommission / 100).toFixed(0)} €`, label: 'Provisionen' },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', kpi.bg)}><kpi.icon className={cn('w-5 h-5', kpi.color)} /></div>
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overdue activities */}
      {overdueActivities.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              Überfällige Aktivitäten ({overdueActivities.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueActivities.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg bg-white border border-red-100">
                  <PhoneCall className="w-4 h-4 text-red-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.lead_name} · {format(new Date(a.scheduled_at), 'dd.MM.yy HH:mm', { locale: de })}</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => completeActivity(a.id)}>Erledigt</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming activities */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Nächste Aktivitäten
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Keine geplanten Aktivitäten. Plane welche unter "Meine Leads"!</p>
          ) : (
            <div className="space-y-2">
              {upcomingActivities.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.lead_name} · {format(new Date(a.scheduled_at), 'dd.MM.yy HH:mm', { locale: de })}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => completeActivity(a.id)}>✓</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversion Rate */}
      {stats.totalLeads > 0 && (
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><TrendingUp className="w-5 h-5 text-primary" /><span className="font-medium">Conversion Rate</span></div>
              <span className="text-2xl font-bold text-primary">{Math.round((stats.converted / stats.totalLeads) * 100)}%</span>
            </div>
            <div className="mt-3 w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(stats.converted / stats.totalLeads) * 100}%` }} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Leads */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Letzte Leads</h3>
            <Button variant="link" size="sm" onClick={() => navigate('/partner/leads')}>Alle anzeigen</Button>
          </div>
          {recentLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Noch keine Leads. Leg los!</p>
          ) : (
            <div className="space-y-3">
              {recentLeads.map(lead => (
                <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">{lead.shop_name}</p>
                    <p className="text-xs text-muted-foreground">{lead.city || 'Keine Stadt'} · {format(new Date(lead.created_at), 'dd.MM.yyyy', { locale: de })}</p>
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

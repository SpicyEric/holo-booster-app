import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ChevronRight, ShieldAlert, Send, Loader2, Trophy, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/app/components/layout/MainLayout';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

interface Message {
  id: string;
  title: string;
  body: string;
  sent_at: string | null;
  read_at: string | null;
  offer_id: string | null;
  image_url: string | null;
  customer?: {
    name: string;
    company_name: string | null;
    logo_url: string | null;
  };
}

export const AppMessages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(true);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [redeemableCount, setRedeemableCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadMessages();
      checkVerification();
      loadRedeemableRewards();
    }
  }, [user]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const checkVerification = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('email_verified')
      .eq('user_id', user.id)
      .maybeSingle();
    setEmailVerified(data?.email_verified ?? true);
  };

  const loadRedeemableRewards = async () => {
    if (!user) return;
    try {
      const { data: accounts } = await supabase
        .from('loyalty_accounts')
        .select('merchant_customer_id, current_points_balance')
        .eq('user_id', user.id)
        .gt('current_points_balance', 0);

      if (!accounts || accounts.length === 0) {
        setRedeemableCount(0);
        return;
      }

      const merchantIds = accounts.map(a => a.merchant_customer_id);
      const pointsMap = new Map(accounts.map(a => [a.merchant_customer_id, a.current_points_balance || 0]));

      // Only count rewards from active merchants
      const { data: activeMerchants } = await supabase
        .from('customers')
        .select('id')
        .in('id', merchantIds)
        .eq('active', true);
      const activeIds = new Set((activeMerchants || []).map((m: any) => m.id));

      const { data: rewards } = await supabase
        .from('rewards')
        .select('id, points_required, merchant_customer_id')
        .eq('is_active', true)
        .in('merchant_customer_id', Array.from(activeIds));

      if (rewards) {
        const count = rewards.filter(r => (pointsMap.get(r.merchant_customer_id) || 0) >= r.points_required).length;
        setRedeemableCount(count);
        // Mark current count as "seen" so badge disappears
        localStorage.setItem(`rewards_seen_count_${user.id}`, count.toString());
      }
    } catch (err) {
      console.error('[Messages] Error loading rewards:', err);
    }
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      // Only show messages from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: rawData, error } = await supabase
        .from('app_messages')
        .select(`
          id, title, body, sent_at, read_at, offer_id, image_url, merchant_customer_id,
          customers!merchant_customer_id (name, company_name, logo_url, active)
        `)
        .eq('user_id', user?.id)
        .gte('sent_at', sevenDaysAgo.toISOString())
        .order('sent_at', { ascending: false });

      // Hide messages from inactive (cancelled) merchants — data stays in DB
      const data = rawData?.filter((m: any) => {
        const c = Array.isArray(m.customers) ? m.customers[0] : m.customers;
        return c?.active === true;
      });

      if (!error && data) {
        // Auto-mark messages WITHOUT offers as read
        const unreadNoOffer = data.filter(m => !m.read_at && !m.offer_id);
        if (unreadNoOffer.length > 0) {
          const ids = unreadNoOffer.map(m => m.id);
          const now = new Date().toISOString();
          await supabase
            .from('app_messages')
            .update({ read_at: now })
            .in('id', ids)
            .eq('user_id', user!.id);
          // Update local data so dots disappear immediately
          data.forEach(m => {
            if (!m.read_at && !m.offer_id) m.read_at = now;
          });
        }

        const formatted = data.map(msg => ({
          ...msg,
          customer: Array.isArray(msg.customers) ? msg.customers[0] : msg.customers,
        }));
        setMessages(formatted as unknown as Message[]);
      }
    } catch (err) {
      console.error('[AppMessages] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user || resendCooldown > 0) return;
    setResending(true);
    try {
      const { error } = await supabase.functions.invoke('send-app-verification-email', {
        body: {
          user_id: user.id,
          email: user.email,
          origin: window.location.origin,
        },
      });
      if (error) throw error;
      toast.success('Bestätigungsmail wurde gesendet!');
      setResendCooldown(60);
    } catch (err: any) {
      toast.error('Fehler beim Senden der E-Mail');
    } finally {
      setResending(false);
    }
  };

  return (
    <MainLayout title="Nachrichten">
      <div className="space-y-4">
        {/* Pinned verification banner */}
        {!emailVerified && (
          <Card className="p-4 border-0 bg-black/[0.06] dark:bg-white/[0.04]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">E-Mail bestätigen</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Bitte bestätige deine E-Mail-Adresse, um Prämien einlösen zu können. Prüfe deinen Posteingang.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={handleResendVerification}
                  disabled={resending || resendCooldown > 0}
                >
                  {resending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {resendCooldown > 0
                    ? `Erneut senden (${resendCooldown}s)`
                    : 'Bestätigungsmail erneut senden'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Pinned redeemable rewards card */}
        {redeemableCount > 0 && (
          <Card
            className="p-4 cursor-pointer hover:shadow-md transition-shadow border-0 bg-black/[0.06] dark:bg-white/[0.04]"
            onClick={() => navigate('/app/rewards')}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <div className="text-xl font-bold text-foreground">
                  {redeemableCount}
                </div>
                <div className="text-sm text-muted-foreground">
                  {redeemableCount === 1 ? 'Einlösbare Prämie' : 'Einlösbare Prämien'}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        )}

        {loading ? (
          <Card className="p-6">
            <p className="text-muted-foreground text-center">Lädt...</p>
          </Card>
        ) : messages.length > 0 ? (
          messages.map((message) => (
            <Card
              key={message.id}
              className={`p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] border-0 ${
                !message.read_at ? 'bg-primary/[0.08] dark:bg-primary/[0.12]' : 'bg-black/[0.06] dark:bg-white/[0.04]'
              }`}
              onClick={() => navigate(`/app/messages/${message.id}`)}
            >
              <div className="flex items-center gap-4">
                {message.customer?.logo_url ? (
                  <img src={message.customer.logo_url} alt={message.customer.company_name || message.customer.name} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground truncate mb-0.5">
                    {message.customer?.company_name || message.customer?.name || 'Unbekannt'}
                  </p>
                  <div className="flex items-center justify-between">
                    <h3 className={`font-semibold truncate ${!message.read_at ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {message.title}
                    </h3>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{message.body}</p>
                  {message.image_url && (
                    <div className="mt-2 rounded-lg overflow-hidden max-h-32">
                      <img src={message.image_url} alt="" className="w-full h-full object-cover rounded-lg max-h-32" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {message.sent_at && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(message.sent_at), 'dd. MMM yyyy', { locale: de })}
                      </p>
                    )}
                    {message.offer_id && (
                      <Badge variant="outline" className="text-xs rounded-full border-primary/30 text-primary">
                        <Gift className="h-3 w-3 mr-1" />
                        Angebot
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          !emailVerified ? null : redeemableCount > 0 ? null : (
            <Card className="p-8 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Keine Nachrichten</h3>
              <p className="text-muted-foreground text-sm">
                Du hast noch keine Nachrichten von Geschäften erhalten.
              </p>
            </Card>
          )
        )}
      </div>
    </MainLayout>
  );
};

export default AppMessages;

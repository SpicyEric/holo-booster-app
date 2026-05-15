import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ChevronRight, Gift, Sparkles } from 'lucide-react';
import { OpenInvitationsPanel } from '@/app/components/OpenInvitationsPanel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/app/components/layout/MainLayout';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Message {
  id: string;
  title: string;
  body: string;
  sent_at: string | null;
  read_at: string | null;
  offer_id: string | null;
  image_url: string | null;
  merchant_customer_id: string | null;
  system_type: string | null;
  cta_label: string | null;
  cta_route: string | null;
  customer?: {
    name: string;
    company_name: string | null;
    logo_url: string | null;
  } | null;
}

export const AppMessages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadMessages();
  }, [user]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: rawData, error } = await supabase
        .from('app_messages')
        .select(`
          id, title, body, sent_at, read_at, offer_id, image_url, merchant_customer_id,
          system_type, cta_label, cta_route,
          customers!merchant_customer_id (name, company_name, logo_url, active)
        `)
        .eq('user_id', user?.id)
        .gte('sent_at', sevenDaysAgo.toISOString())
        .order('sent_at', { ascending: false });

      // Hide messages from inactive merchants — keep system messages (no merchant)
      const data = rawData?.filter((m: any) => {
        if (!m.merchant_customer_id) return true;
        const c = Array.isArray(m.customers) ? m.customers[0] : m.customers;
        return c?.active === true;
      });

      if (!error && data) {
        // Auto-mark messages WITHOUT offers / CTA as read
        const unreadAuto = data.filter((m: any) => !m.read_at && !m.offer_id && !m.cta_route);
        if (unreadAuto.length > 0) {
          const ids = unreadAuto.map((m: any) => m.id);
          const now = new Date().toISOString();
          await supabase
            .from('app_messages')
            .update({ read_at: now })
            .in('id', ids)
            .eq('user_id', user!.id);
          data.forEach((m: any) => {
            if (!m.read_at && !m.offer_id && !m.cta_route) m.read_at = now;
          });
        }

        const formatted = data.map((msg: any) => ({
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

  const renderSenderName = (m: Message) =>
    m.system_type ? 'Eloyo' : (m.customer?.company_name || m.customer?.name || 'Unbekannt');

  const renderAvatar = (m: Message) => {
    if (m.system_type) {
      return (
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
      );
    }
    if (m.customer?.logo_url) {
      return <img src={m.customer.logo_url} alt={renderSenderName(m)} className="w-12 h-12 rounded-full object-cover" />;
    }
    return (
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
        <MessageSquare className="h-6 w-6 text-primary" />
      </div>
    );
  };

  return (
    <MainLayout title="Nachrichten">
      <div className="space-y-4">
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
                {renderAvatar(message)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground truncate mb-0.5">
                    {renderSenderName(message)}
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
          <Card className="p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Keine Nachrichten</h3>
            <p className="text-muted-foreground text-sm">
              Du hast noch keine Nachrichten von Geschäften erhalten.
            </p>
          </Card>
        )}

        <OpenInvitationsPanel />
      </div>
    </MainLayout>
  );
};

export default AppMessages;

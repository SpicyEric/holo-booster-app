import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ChevronRight, ShieldAlert, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  customer?: {
    name: string;
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

  useEffect(() => {
    if (user) {
      loadMessages();
      checkVerification();
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

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_messages')
        .select(`
          id, title, body, sent_at, read_at, merchant_customer_id,
          customers!merchant_customer_id (name, logo_url)
        `)
        .eq('user_id', user?.id)
        .order('sent_at', { ascending: false });

      if (!error && data) {
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
          <Card className="p-4 border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">E-Mail bestätigen</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Bitte bestätige deine E-Mail-Adresse, um Prämien einlösen zu können. Prüfe deinen Posteingang.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 border-amber-400 text-amber-700 hover:bg-amber-100"
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

        {loading ? (
          <Card className="p-6">
            <p className="text-muted-foreground text-center">Lädt...</p>
          </Card>
        ) : messages.length > 0 ? (
          messages.map((message) => (
            <Card
              key={message.id}
              className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                !message.read_at ? 'border-l-4 border-l-primary' : ''
              }`}
              onClick={() => navigate(`/app/messages/${message.id}`)}
            >
              <div className="flex items-center gap-4">
                {message.customer?.logo_url ? (
                  <img src={message.customer.logo_url} alt={message.customer.name} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-semibold truncate ${!message.read_at ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {message.title}
                    </h3>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{message.body}</p>
                  {message.sent_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(message.sent_at), 'dd. MMM yyyy', { locale: de })}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))
        ) : (
          !emailVerified ? null : (
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

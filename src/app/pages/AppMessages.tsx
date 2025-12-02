import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { MainLayout } from '@/app/components/layout/MainLayout';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

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

  useEffect(() => {
    if (user) {
      loadMessages();
    }
  }, [user]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_messages')
        .select(`
          id,
          title,
          body,
          sent_at,
          read_at,
          merchant_customer_id,
          customers!merchant_customer_id (
            name,
            logo_url
          )
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
              className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                !message.read_at ? 'border-l-4 border-l-primary' : ''
              }`}
              onClick={() => navigate(`/app/messages/${message.id}`)}
            >
              <div className="flex items-center gap-4">
                {message.customer?.logo_url ? (
                  <img
                    src={message.customer.logo_url}
                    alt={message.customer.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
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
      </div>
    </MainLayout>
  );
};

export default AppMessages;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { Loader2, Mail, MailOpen } from "lucide-react";

interface Message {
  id: string;
  subject: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export default function SalesRepMessages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  useEffect(() => {
    // For now, show placeholder - admin-to-sales-rep messaging will be implemented
    setLoading(false);
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nachrichten</h1>

      {messages.length === 0 ? (
        <GlassCard>
          <div className="p-12 text-center">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Keine Nachrichten vorhanden</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Hier erscheinen Systemnachrichten und Nachrichten vom Admin.
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {messages.map(msg => (
            <GlassCard key={msg.id}>
              <button
                onClick={() => setSelectedMessage(msg)}
                className="w-full p-4 text-left flex items-start gap-3"
              >
                {msg.read_at ? (
                  <MailOpen className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                ) : (
                  <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${!msg.read_at ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {msg.subject}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">{msg.body}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {new Date(msg.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </button>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

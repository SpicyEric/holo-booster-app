import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GlassCard } from "@/components/GlassCard";
import { Loader2, Mail, MailOpen, Package, AlertTriangle, FileWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  metadata: any;
  read_at: string | null;
  created_at: string;
}

const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  box_frist_warnung: Package,
  box_rechnung: FileWarning,
  info: Mail,
};

export default function SalesRepMessages() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("sales_rep_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setNotifications((data as Notification[]) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notif: Notification) => {
    if (notif.read_at) return;
    await supabase
      .from("sales_rep_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notif.id);
    setNotifications(prev =>
      prev.map(n => n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n)
    );
  };

  const handleSelect = (notif: Notification) => {
    setSelectedNotification(notif);
    markAsRead(notif);
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nachrichten</h1>
        {unreadCount > 0 && (
          <Badge variant="destructive" className="text-xs">{unreadCount} ungelesen</Badge>
        )}
      </div>

      {selectedNotification ? (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedNotification(null)}
            className="text-sm text-primary hover:underline"
          >
            ← Zurück zur Übersicht
          </button>
          <GlassCard>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                {(() => {
                  const Icon = NOTIFICATION_ICONS[selectedNotification.notification_type] || Mail;
                  return <Icon className="h-6 w-6 text-orange-600 shrink-0 mt-0.5" />;
                })()}
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">{selectedNotification.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {new Date(selectedNotification.created_at).toLocaleDateString('de-DE', {
                      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              <div className="whitespace-pre-wrap text-sm text-foreground/80 leading-relaxed">
                {selectedNotification.body}
              </div>

              {selectedNotification.metadata?.boxes && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Betroffene Boxen</p>
                  <div className="grid gap-2">
                    {(selectedNotification.metadata.boxes as any[]).map((box: any) => (
                      <div key={box.box_id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-orange-600" />
                          <code className="text-sm font-mono font-semibold">{box.box_id}</code>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-medium ${box.days_remaining <= 5 ? 'text-red-600' : 'text-orange-600'}`}>
                            {box.days_remaining <= 0 ? 'Abgelaufen' : `Noch ${box.days_remaining} Tag${box.days_remaining !== 1 ? 'e' : ''}`}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            Frist: {new Date(box.frist_ablauf).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      ) : notifications.length === 0 ? (
        <GlassCard>
          <div className="p-12 text-center">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Keine Nachrichten vorhanden</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Hier erscheinen Systemnachrichten und Warnungen zu deinen Boxen.
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {notifications.map(notif => {
            const Icon = NOTIFICATION_ICONS[notif.notification_type] || Mail;
            const isWarning = notif.notification_type === 'box_frist_warnung';
            const isInvoice = notif.notification_type === 'box_rechnung';
            return (
              <GlassCard key={notif.id}>
                <button
                  onClick={() => handleSelect(notif)}
                  className={`w-full p-4 text-left flex items-start gap-3 transition-colors ${!notif.read_at ? 'bg-orange-50/50' : ''}`}
                >
                  <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${
                    isWarning ? 'text-orange-600' : isInvoice ? 'text-red-600' : notif.read_at ? 'text-muted-foreground' : 'text-primary'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium truncate ${!notif.read_at ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {notif.title}
                      </p>
                      {!notif.read_at && (
                        <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {notif.body.split('\n')[0]}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {new Date(notif.created_at).toLocaleDateString('de-DE', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </button>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

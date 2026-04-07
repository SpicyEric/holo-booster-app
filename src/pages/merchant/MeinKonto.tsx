import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Loader2, KeyRound, User, Mail, CreditCard, FileText, 
  Download, ExternalLink, ChevronDown, ChevronUp, AlertTriangle, Shield
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
  customer_number: number | null;
  status: string | null;
  stripe_subscription_id: string | null;
}

interface Invoice {
  id: string;
  stripe_invoice_id: string | null;
  total_amount_cents: number | null;
  currency: string | null;
  status: string | null;
  invoice_type: string | null;
  issued_at: string | null;
  pdf_url: string | null;
}

interface SubscriptionInfo {
  hasSubscription: boolean;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelAt: string | null;
  plan?: {
    name: string;
    amount: number;
    currency: string;
    interval: string;
  };
}

export default function MeinKonto() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showAllInvoices, setShowAllInvoices] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cancelChoice, setCancelChoice] = useState<'pause' | 'cancel'>('pause');
  const [pauseMonths, setPauseMonths] = useState('1');

  const INVOICES_INITIAL = 4;

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: assignment } = await supabase
        .from("merchant_assignments")
        .select("customer_id")
        .eq("merchant_user_id", user?.id)
        .single();

      if (assignment) {
        const { data: customerData } = await supabase
          .from("customers")
          .select("id, name, email, company_name, customer_number, status, stripe_subscription_id")
          .eq("id", assignment.customer_id)
          .single();
        
        if (customerData) {
          setCustomer(customerData);
          const { data: invoiceData } = await supabase
            .from('invoices')
            .select('*')
            .eq('customer_id', assignment.customer_id)
            .order('issued_at', { ascending: false });
          if (invoiceData) setInvoices(invoiceData);

          if (customerData.stripe_subscription_id) {
            try {
              const { data: subInfo } = await supabase.functions.invoke('get-subscription-info');
              if (subInfo) setSubscription(subInfo);
            } catch (error) {
              console.error('Error loading subscription:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) { toast.error("Passwörter stimmen nicht überein"); return; }
    if (newPassword.length < 6) { toast.error("Passwort muss mindestens 6 Zeichen lang sein"); return; }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Passwort erfolgreich geändert");
      setShowPasswordDialog(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error("Fehler beim Ändern des Passworts");
    } finally {
      setChangingPassword(false);
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-customer-portal');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (error) {
      toast.error('Fehler beim Öffnen des Kundenportals');
    }
  };

  const handlePauseSubscription = async () => {
    setProcessingAction(true);
    try {
      const { error } = await supabase.functions.invoke('pause-subscription', { body: { pauseMonths: parseInt(pauseMonths) } });
      if (error) throw error;
      toast.success(`Abo für ${pauseMonths} Monat(e) pausiert`);
      setShowCancelDialog(false);
      loadData();
    } catch (error) {
      toast.error('Fehler beim Pausieren');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCancelSubscription = async () => {
    setProcessingAction(true);
    try {
      const { error } = await supabase.functions.invoke('cancel-subscription');
      if (error) throw error;
      toast.success('Abo wird zum Ende der Laufzeit gekündigt');
      setShowCancelDialog(false);
      loadData();
    } catch (error) {
      toast.error('Fehler beim Kündigen');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCancelDialogConfirm = () => {
    cancelChoice === 'pause' ? handlePauseSubscription() : handleCancelSubscription();
  };

  const formatAmount = (cents: number | null, currency: string | null) => {
    if (!cents) return '-';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: currency || 'EUR' }).format(cents / 100);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('de-DE');
  };

  const getStatusBadge = (status: string | null) => {
    const cfg: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      'paid': { variant: 'default', label: 'Bezahlt' },
      'open': { variant: 'secondary', label: 'Offen' },
      'void': { variant: 'outline', label: 'Storniert' },
      'uncollectible': { variant: 'destructive', label: 'Nicht einziehbar' },
    };
    const c = cfg[status || ''] || { variant: 'outline' as const, label: status || '-' };
    return <Badge variant={c.variant} className="rounded-full text-[10px] px-2">{c.label}</Badge>;
  };

  const displayedInvoices = showAllInvoices ? invoices : invoices.slice(0, INVOICES_INITIAL);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const SectionCard = ({ icon: Icon, iconBg, iconColor, title, description, children }: {
    icon: React.ElementType; iconBg: string; iconColor: string; title: string; description?: string; children: React.ReactNode;
  }) => (
    <Card className="rounded-2xl border-border/50 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconBg)}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
          {title}
        </CardTitle>
        {description && <CardDescription className="text-muted-foreground">{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Konto</h1>
          <p className="text-muted-foreground mt-1">
            Kontodaten, Abonnement und Rechnungen verwalten
          </p>
        </div>

        {/* Account Info */}
        <SectionCard icon={User} iconBg="bg-primary/10" iconColor="text-primary" title="Kontoinformationen">
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 bg-muted/50 rounded-xl">
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Geschäftsname</Label>
                <p className="font-semibold text-foreground mt-1">{customer?.name || "-"}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl">
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Kundennummer</Label>
                <p className="font-semibold text-foreground mt-1">{customer?.customer_number || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{user?.email}</span>
            </div>
          </div>
        </SectionCard>

        {/* Subscription */}
        <SectionCard icon={CreditCard} iconBg="bg-primary/10" iconColor="text-primary" title="Abonnement" description="Ihr aktueller Tarif und Zahlungsstatus">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div>
                <p className="font-semibold text-foreground">
                  {subscription?.plan?.name || 'Eloyo Abo'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {subscription?.cancelAtPeriodEnd
                    ? `Endet am: ${formatDate(subscription.currentPeriodEnd)}`
                    : subscription?.currentPeriodEnd
                      ? `Nächste Zahlung: ${formatDate(subscription.currentPeriodEnd)}`
                      : 'Keine aktive Subscription'}
                </p>
              </div>
              <Badge 
                variant={subscription?.cancelAtPeriodEnd ? 'destructive' : customer?.status === 'active' ? 'default' : 'secondary'}
                className="rounded-full"
              >
                {subscription?.cancelAtPeriodEnd ? 'Gekündigt' : customer?.status === 'active' ? 'Aktiv' : customer?.status === 'paused' ? 'Pausiert' : customer?.status || 'Unbekannt'}
              </Badge>
            </div>

            {subscription?.cancelAtPeriodEnd && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-amber-900 dark:text-amber-200 text-sm">Kündigung vorgemerkt</p>
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      Ihr Abo wurde gekündigt und endet am <strong>{formatDate(subscription.currentPeriodEnd)}</strong>. 
                      Bis dahin bleibt Ihr Geschäft in der App sichtbar und alle Funktionen stehen Ihnen weiterhin zur Verfügung.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={openCustomerPortal} className="rounded-xl">
                <ExternalLink className="h-4 w-4 mr-2" />
                Zahlungsmethode ändern
              </Button>
              {subscription?.cancelAtPeriodEnd ? (
                <Button className="rounded-xl" onClick={handleReactivateSubscription} disabled={processingAction}>
                  {processingAction && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Kündigung widerrufen
                </Button>
              ) : customer?.status === 'active' && (
                <Button variant="outline" className="rounded-xl text-muted-foreground" onClick={() => { setCancelChoice('pause'); setShowCancelDialog(true); }}>
                  Abo kündigen
                </Button>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Invoices */}
        <SectionCard icon={FileText} iconBg="bg-secondary/10" iconColor="text-secondary" title="Rechnungen" description="Alle Rechnungen zum Download">
          {invoices.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Noch keine Rechnungen vorhanden</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayedInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3.5 bg-muted/50 rounded-xl hover:bg-muted/70 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{formatDate(invoice.issued_at)}</p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.invoice_type === 'subscription' ? 'Abo' 
                          : invoice.invoice_type === 'boost' ? 'Neukunden-Boost'
                          : invoice.invoice_type === 'sms_campaign' ? 'SMS-Kampagne'
                          : 'Einmalig'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm text-foreground tabular-nums">
                      {formatAmount(invoice.total_amount_cents, invoice.currency)}
                    </span>
                    {getStatusBadge(invoice.status)}
                    {invoice.pdf_url && (
                      <Button variant="ghost" size="sm" asChild className="rounded-lg h-8 w-8 p-0">
                        <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {invoices.length > INVOICES_INITIAL && (
                <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={() => setShowAllInvoices(!showAllInvoices)}>
                  {showAllInvoices ? (
                    <>Weniger anzeigen <ChevronUp className="w-4 h-4 ml-1" /></>
                  ) : (
                    <>Alle {invoices.length} Rechnungen <ChevronDown className="w-4 h-4 ml-1" /></>
                  )}
                </Button>
              )}
            </div>
          )}
        </SectionCard>

        {/* Password */}
        <SectionCard icon={Shield} iconBg="bg-secondary/10" iconColor="text-secondary" title="Sicherheit" description="Passwort und Zugangsdaten verwalten">
          <Button variant="outline" onClick={() => setShowPasswordDialog(true)} className="rounded-xl">
            <KeyRound className="h-4 w-4 mr-2" />
            Passwort ändern
          </Button>
        </SectionCard>

        {/* Password Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Passwort ändern</DialogTitle>
              <DialogDescription>Geben Sie ein neues Passwort ein (mindestens 6 Zeichen)</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-foreground">Neues Passwort</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="rounded-xl mt-1" />
              </div>
              <div>
                <Label className="text-sm text-foreground">Passwort bestätigen</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="rounded-xl mt-1" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)} className="rounded-xl">Abbrechen</Button>
              <Button onClick={changePassword} disabled={changingPassword} className="rounded-xl">
                {changingPassword && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel/Pause Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Abo kündigen</DialogTitle>
              <DialogDescription>Was möchten Sie tun?</DialogDescription>
            </DialogHeader>
            <RadioGroup value={cancelChoice} onValueChange={(v) => setCancelChoice(v as 'pause' | 'cancel')} className="space-y-3">
              <label className={cn("flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors",
                cancelChoice === 'pause' ? 'border-primary bg-primary/5' : 'border-border bg-card')}>
                <RadioGroupItem value="pause" className="mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">Abo pausieren</p>
                  <p className="text-sm text-muted-foreground mt-1">Ihr Abo wird vorübergehend pausiert. Danach geht es automatisch weiter.</p>
                </div>
              </label>
              <label className={cn("flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors",
                cancelChoice === 'cancel' ? 'border-primary bg-primary/5' : 'border-border bg-card')}>
                <RadioGroupItem value="cancel" className="mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">Abo endgültig kündigen</p>
                  <p className="text-sm text-muted-foreground mt-1">Ihr Abo wird zum Ende der Laufzeit beendet.</p>
                </div>
              </label>
            </RadioGroup>

            {cancelChoice === 'pause' && (
              <div className="space-y-2">
                <Label>Wie lange pausieren?</Label>
                <Select value={pauseMonths} onValueChange={setPauseMonths}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Monat</SelectItem>
                    <SelectItem value="2">2 Monate</SelectItem>
                    <SelectItem value="3">3 Monate</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Während der Pause ist Ihr Geschäft im eloyo-Netzwerk nicht sichtbar.</p>
              </div>
            )}

            {cancelChoice === 'cancel' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">Achtung: Unwiderruflicher Datenverlust</p>
                    <p className="text-sm text-amber-800 mt-1">
                      Mit der Kündigung verlieren Sie dauerhaft den Zugriff auf Ihren gesamten Kundenstamm und alle gesammelten Kontaktdaten.
                    </p>
                    <p className="text-sm text-amber-800 mt-2 font-medium">Tipp: Pausieren Sie stattdessen – so bleiben alle Daten erhalten.</p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowCancelDialog(false)} className="rounded-xl">Abbrechen</Button>
              <Button onClick={handleCancelDialogConfirm} disabled={processingAction} className="rounded-xl" variant={cancelChoice === 'cancel' ? 'destructive' : 'default'}>
                {processingAction && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {cancelChoice === 'pause' ? 'Jetzt pausieren' : 'Endgültig kündigen'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

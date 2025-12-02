import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, FileText, Download, ExternalLink, Pause, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  status: string;
  current_period_end: string | null;
  plan_name: string | null;
  amount: number | null;
  cancel_at_period_end: boolean;
}

const Zahlungen = () => {
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerStatus, setCustomerStatus] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [pauseMonths, setPauseMonths] = useState('1');
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: assignment } = await supabase
        .from('merchant_assignments')
        .select('customer_id')
        .eq('merchant_user_id', user.id)
        .single();

      if (!assignment) {
        setLoading(false);
        return;
      }

      setCustomerId(assignment.customer_id);

      // Load customer status
      const { data: customer } = await supabase
        .from('customers')
        .select('status, stripe_subscription_id')
        .eq('id', assignment.customer_id)
        .single();

      if (customer) {
        setCustomerStatus(customer.status);
      }

      // Load invoices
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', assignment.customer_id)
        .order('issued_at', { ascending: false });

      if (invoiceData) {
        setInvoices(invoiceData);
      }

      // Load subscription info
      if (customer?.stripe_subscription_id) {
        try {
          const { data: subInfo } = await supabase.functions.invoke('get-subscription-info');
          if (subInfo) {
            setSubscription(subInfo);
          }
        } catch (error) {
          console.error('Error loading subscription:', error);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      toast.error('Fehler beim Öffnen des Kundenportals');
    }
  };

  const handlePauseSubscription = async () => {
    setProcessingAction(true);
    try {
      const { error } = await supabase.functions.invoke('pause-subscription', {
        body: { pauseMonths: parseInt(pauseMonths) }
      });
      if (error) throw error;
      toast.success(`Abo für ${pauseMonths} Monat(e) pausiert`);
      setShowPauseDialog(false);
      loadData();
    } catch (error) {
      console.error('Error pausing subscription:', error);
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
      console.error('Error canceling subscription:', error);
      toast.error('Fehler beim Kündigen');
    } finally {
      setProcessingAction(false);
    }
  };

  const formatAmount = (cents: number | null, currency: string | null) => {
    if (!cents) return '-';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency || 'EUR'
    }).format(cents / 100);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('de-DE');
  };

  const getStatusBadge = (status: string | null) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      'paid': { variant: 'default', label: 'Bezahlt' },
      'open': { variant: 'secondary', label: 'Offen' },
      'void': { variant: 'outline', label: 'Storniert' },
      'uncollectible': { variant: 'destructive', label: 'Nicht einziehbar' },
    };
    const config = statusConfig[status || ''] || { variant: 'outline', label: status || '-' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Zahlungen</h1>
        <p className="text-muted-foreground">Verwalten Sie Ihr Abonnement und Rechnungen</p>
      </div>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Abonnement
          </CardTitle>
          <CardDescription>Ihr aktueller Tarif und Zahlungsstatus</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Eloyo Abo</p>
              <p className="text-sm text-muted-foreground">
                {subscription?.current_period_end 
                  ? `Nächste Zahlung: ${formatDate(subscription.current_period_end)}`
                  : 'Keine aktive Subscription'}
              </p>
            </div>
            <Badge variant={customerStatus === 'active' ? 'default' : 'secondary'}>
              {customerStatus === 'active' ? 'Aktiv' : customerStatus === 'paused' ? 'Pausiert' : customerStatus || 'Unbekannt'}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={openCustomerPortal}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Zahlungsmethode ändern
            </Button>
            
            {customerStatus === 'active' && (
              <>
                <Button variant="outline" onClick={() => setShowPauseDialog(true)}>
                  <Pause className="h-4 w-4 mr-2" />
                  Pausieren
                </Button>
                <Button variant="outline" className="text-destructive" onClick={() => setShowCancelDialog(true)}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Kündigen
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Rechnungen
          </CardTitle>
          <CardDescription>Alle Ihre Rechnungen zum Download</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Noch keine Rechnungen vorhanden</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{formatDate(invoice.issued_at)}</p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.invoice_type === 'subscription' ? 'Abo' : 'Einmalig'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium">
                      {formatAmount(invoice.total_amount_cents, invoice.currency)}
                    </span>
                    {getStatusBadge(invoice.status)}
                    {invoice.pdf_url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pause Dialog */}
      <AlertDialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abo pausieren</AlertDialogTitle>
            <AlertDialogDescription>
              Wie lange möchten Sie Ihr Abo pausieren?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Select value={pauseMonths} onValueChange={setPauseMonths}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Monat</SelectItem>
              <SelectItem value="2">2 Monate</SelectItem>
            </SelectContent>
          </Select>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handlePauseSubscription} disabled={processingAction}>
              {processingAction && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Pausieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abo kündigen</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie Ihr Abo wirklich kündigen? Es bleibt bis zum Ende der aktuellen Laufzeit aktiv.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelSubscription} 
              disabled={processingAction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processingAction && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Kündigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Zahlungen;

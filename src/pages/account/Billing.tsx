import { useState, useEffect } from "react";
import ClassicNav from "@/components/ClassicNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Invoice {
  id: string;
  stripe_invoice_id: string;
  pdf_url: string | null;
  total_amount_cents: number;
  currency: string;
  status: string;
  issued_at: string;
}

interface CustomerData {
  id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: string;
  customer_number: number;
}

export default function Billing() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      // Load customer data
      const { data: customer } = await supabase
        .from("customers")
        .select("id, stripe_customer_id, stripe_subscription_id, status, customer_number")
        .eq("email", user?.email)
        .single();

      if (customer) {
        setCustomerData(customer);

        // Load invoices
        const { data: invoicesData } = await supabase
          .from("invoices")
          .select("*")
          .eq("customer_id", customer.id)
          .order("issued_at", { ascending: false });

        if (invoicesData) {
          setInvoices(invoicesData);
        }
      }
    } catch (error) {
      console.error("Error loading billing data:", error);
    }
  };

  const openCustomerPortal = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-customer-portal");

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Portal error:", error);
      toast.error(error.message || "Fehler beim Öffnen des Kundenportals");
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: currency,
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      past_due: "destructive",
      canceled: "secondary",
      pending: "secondary",
    };

    const labels: Record<string, string> = {
      active: "Aktiv",
      past_due: "Zahlungsrückstand",
      canceled: "Gekündigt",
      pending: "Ausstehend",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <ClassicNav items={[]} />
      
      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Rechnungen & Abonnement</h1>
            <p className="text-muted-foreground">
              Verwalten Sie Ihre Zahlungsmethode und laden Sie Rechnungen herunter
            </p>
          </div>

          {/* Subscription Status */}
          {customerData && (
            <Card>
              <CardHeader>
                <CardTitle>Ihr Abonnement</CardTitle>
                <CardDescription>
                  Kundennummer: {customerData.customer_number}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Status</p>
                    <div className="mt-2">
                      {getStatusBadge(customerData.status)}
                    </div>
                  </div>
                  <Button
                    onClick={openCustomerPortal}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Laden...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Zahlungsmethode verwalten
                      </>
                    )}
                  </Button>
                </div>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Im Kundenportal können Sie Ihre Zahlungsmethode ändern,
                    Rechnungen einsehen und Ihr Abonnement verwalten.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Rechnungen</CardTitle>
              <CardDescription>
                Alle Ihre Rechnungen im Überblick
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Noch keine Rechnungen vorhanden
                </p>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-semibold">
                            {formatDate(invoice.issued_at)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {invoice.stripe_invoice_id}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatAmount(invoice.total_amount_cents, invoice.currency)}
                          </p>
                          <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>
                            {invoice.status === "paid" ? "Bezahlt" : invoice.status}
                          </Badge>
                        </div>
                        {invoice.pdf_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = invoice.pdf_url!;
                              link.download = `Rechnung-${invoice.stripe_invoice_id}.pdf`;
                              link.target = '_blank';
                              link.rel = 'noopener noreferrer';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
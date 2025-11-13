import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Download } from "lucide-react";
import Particles from "@/components/Particles";
import { CustomerHeader } from "@/components/CustomerHeader";

interface Invoice {
  id: string;
  stripe_invoice_id: string;
  pdf_url: string | null;
  total_amount_cents: number;
  currency: string;
  status: string;
  issued_at: string;
  invoice_type: string;
}

export default function CustomerInvoices() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadInvoices();
    }
  }, [user]);

  const loadInvoices = async () => {
    try {
      setLoading(true);

      const { data: customerUser } = await supabase
        .from("customer_users")
        .select("customer_id")
        .eq("user_id", user?.id)
        .single();

      if (!customerUser) {
        toast.error("Kein Kunde gefunden");
        return;
      }

      const { data: invoicesData } = await supabase
        .from("invoices")
        .select("*")
        .eq("customer_id", customerUser.customer_id)
        .order("issued_at", { ascending: false });

      setInvoices(invoicesData || []);
    } catch (error) {
      console.error("Error loading invoices:", error);
      toast.error("Fehler beim Laden der Rechnungen");
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getInvoiceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      subscription: "Abo",
      sms_campaign: "SMS-Kampagne",
      refund: "Erstattung"
    };
    return labels[type] || type;
  };

  const getInvoiceTypeBadgeVariant = (type: string): "default" | "secondary" | "destructive" => {
    if (type === "refund") return "destructive";
    if (type === "sms_campaign") return "secondary";
    return "default";
  };

  const filteredInvoices = filterType === "all" 
    ? invoices 
    : invoices.filter(inv => inv.invoice_type === filterType);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Particles 
        particleColors={['#8B5CF6', '#3B82F6', '#8B5CF6']}
        particleCount={100}
        particleSpread={8}
        speed={0.05}
        particleBaseSize={100}
        sizeRandomness={1.5}
        moveParticlesOnHover={true}
        alphaParticles={true}
        disableRotation={false}
        cameraDistance={20}
      />
      
      <CustomerHeader />

      <main className="container mx-auto px-4 py-8 space-y-6 relative z-10 max-w-4xl">
        <h1 className="text-3xl font-bold">Ihre Rechnungen</h1>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Alle Rechnungen</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={filterType === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("all")}
                >
                  Alle
                </Button>
                <Button
                  variant={filterType === "subscription" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("subscription")}
                >
                  Abo
                </Button>
                <Button
                  variant={filterType === "sms_campaign" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("sms_campaign")}
                >
                  SMS-Kampagnen
                </Button>
                <Button
                  variant={filterType === "refund" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("refund")}
                >
                  Erstattungen
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredInvoices.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {filterType === "all" 
                  ? "Keine Rechnungen vorhanden" 
                  : `Keine ${getInvoiceTypeLabel(filterType)}-Rechnungen vorhanden`}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">
                          Rechnung vom {formatDate(invoice.issued_at)}
                        </p>
                        <span 
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            invoice.invoice_type === 'refund' 
                              ? 'bg-destructive/10 text-destructive' 
                              : invoice.invoice_type === 'sms_campaign'
                              ? 'bg-secondary text-secondary-foreground'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {getInvoiceTypeLabel(invoice.invoice_type)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatAmount(invoice.total_amount_cents, invoice.currency)} •{" "}
                        <span className="capitalize">{invoice.status}</span>
                      </p>
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
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        PDF
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
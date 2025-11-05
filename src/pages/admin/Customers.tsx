import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { Plus, Edit, QrCode } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Customer {
  id: string;
  name: string;
  google_review_url: string;
  offer_text: string;
  logo_url: string | null;
  qr_code_url: string | null;
  active: boolean;
  created_at: string;
}

const Customers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast.error("Fehler beim Laden der Kunden");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Kundenverwaltung
          </h1>
          <p className="text-muted-foreground mt-1">
            Alle Kunden mit QR-Codes & Einstellungen
          </p>
        </div>
        <GradientButton
          onClick={() => navigate("/admin/customers/new")}
          icon={Plus}
        >
          Neuer Kunde
        </GradientButton>
      </div>

      <GlassCard>
        {loading ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-gradient-primary animate-pulse-glow mx-auto" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Noch keine Kunden angelegt
            </p>
            <GradientButton
              onClick={() => navigate("/admin/customers/new")}
              icon={Plus}
            >
              Ersten Kunden anlegen
            </GradientButton>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>QR-Code</TableHead>
                <TableHead>Erstellt</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {customer.logo_url && (
                        <img
                          src={customer.logo_url}
                          alt={customer.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      )}
                      {customer.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.active ? "default" : "secondary"}>
                      {customer.active ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {customer.qr_code_url ? (
                      <QrCode className="w-5 h-5 text-primary" />
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Nicht generiert
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(customer.created_at).toLocaleDateString("de-DE")}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() =>
                        navigate(`/admin/customers/${customer.id}`)
                      }
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-background/50 hover:bg-background border border-border rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Bearbeiten
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassCard>
    </div>
  );
};

export default Customers;

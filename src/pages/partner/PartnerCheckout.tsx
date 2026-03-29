import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import CheckoutForm from "@/components/checkout/CheckoutForm";

export default function PartnerCheckout() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/partner/dashboard')} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Dashboard
      </Button>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Neuen Kunden abschließen</h1>
        <p className="text-muted-foreground">Startbox + Abo für deinen neuen Eloyo-Kunden</p>
      </div>
      <CheckoutForm backPath="/partner/dashboard" backLabel="Zurück zum Dashboard" partnerUserId={user?.id} />
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CheckoutForm from "@/components/checkout/CheckoutForm";

export default function Checkout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-4 md:p-8 font-body">
      <div className="max-w-5xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/admin/customers")} className="mb-6">
          ← Zurück zu Kunden
        </Button>
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Neuen Kunden abschließen</h1>
          <p className="text-muted-foreground">Startbox + Abo für deinen neuen Eloyo-Kunden</p>
        </div>
        <CheckoutForm backPath="/admin/customers" backLabel="Zurück zu Kunden" />
      </div>
    </div>
  );
}

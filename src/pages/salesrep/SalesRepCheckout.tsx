import { useAuth } from "@/hooks/useAuth";
import CheckoutForm from "@/components/checkout/CheckoutForm";

export default function SalesRepCheckout() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Neuen Kunden abschließen</h1>
        <p className="text-muted-foreground">Startbox + Abo für deinen neuen Eloyo-Kunden</p>
      </div>
      <CheckoutForm backPath="/vertriebler" backLabel="Zurück zum Dashboard" partnerUserId={user?.id} />
    </div>
  );
}

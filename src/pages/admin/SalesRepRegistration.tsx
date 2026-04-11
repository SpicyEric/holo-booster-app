import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { UserPlus, ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SalesRepRegistration = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    street: "",
    house_number: "",
    postal_code: "",
    city: "",
    country: "Deutschland",
    notes: "",
  });

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.first_name || !form.last_name || !form.email) {
      toast.error("Bitte Vorname, Nachname und E-Mail ausfüllen");
      return;
    }

    setSaving(true);
    try {
      // 1. Create user via edge function (auto-generates password, sends email)
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("createUserAccount", {
        body: {
          email: form.email,
          full_name: `${form.first_name} ${form.last_name}`,
          role: "partner",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const userId = data.user?.id;
      if (!userId) throw new Error("Benutzer konnte nicht erstellt werden");

      // 2. Create sales rep profile
      const { error: profileError } = await supabase
        .from("sales_rep_profiles" as any)
        .insert([
          {
            user_id: userId,
            first_name: form.first_name,
            last_name: form.last_name,
            email: form.email,
            phone: form.phone,
            street: form.street,
            house_number: form.house_number,
            postal_code: form.postal_code,
            city: form.city,
            country: form.country,
            notes: form.notes,
            contract_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            contract_status: 'pending',
          },
        ]);
      if (profileError) {
        console.error("Fehler beim Erstellen des Vertriebsprofils:", profileError);
      }

      toast.success(`Vertriebler ${form.first_name} ${form.last_name} wurde registriert! Eine E-Mail mit Zugangsdaten wurde versendet.`);
      navigate("/admin/accounts");
    } catch (error: any) {
      console.error("Fehler:", error);
      toast.error(error.message || "Fehler beim Erstellen des Vertrieblers");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/admin/accounts")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Vertriebler registrieren</h1>
          <p className="text-sm text-muted-foreground">Neuen Vertriebspartner im System anlegen</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Persönliche Daten */}
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Persönliche Daten</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Vorname *</Label>
              <Input value={form.first_name} onChange={(e) => update("first_name", e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Nachname *</Label>
              <Input value={form.last_name} onChange={(e) => update("last_name", e.target.value)} className="h-9" />
            </div>
          </div>
          <div>
            <Label className="text-xs">E-Mail-Adresse *</Label>
            <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Telefonnummer</Label>
            <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="h-9" placeholder="+49 ..." />
          </div>
          <p className="text-xs text-muted-foreground">Der Vertriebler erhält eine E-Mail mit Zugangsdaten zur Passwortvergabe.</p>
        </Card>

        {/* Anschrift */}
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Wohnanschrift</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Straße</Label>
              <Input value={form.street} onChange={(e) => update("street", e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Hausnr.</Label>
              <Input value={form.house_number} onChange={(e) => update("house_number", e.target.value)} className="h-9" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">PLZ</Label>
              <Input value={form.postal_code} onChange={(e) => update("postal_code", e.target.value)} className="h-9" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Ort</Label>
              <Input value={form.city} onChange={(e) => update("city", e.target.value)} className="h-9" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Land</Label>
            <Input value={form.country} onChange={(e) => update("country", e.target.value)} className="h-9" />
          </div>
        </Card>
      </div>

      {/* Notizen */}
      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notizen</h2>
        <Textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Interne Notizen zum Vertriebler..."
          rows={3}
        />
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/admin/accounts")}>Abbrechen</Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
          {saving ? "Wird erstellt..." : "Vertriebler registrieren"}
        </Button>
      </div>
    </div>
  );
};

export default SalesRepRegistration;

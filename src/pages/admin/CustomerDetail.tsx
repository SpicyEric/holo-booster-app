import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save, Trash2, ExternalLink, CreditCard, FileText, Hash } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  "Café",
  "Restaurant", 
  "Shishabar",
  "CBD-Shop",
  "Bäckerei",
  "Fashion Store",
  "Barbershop",
  "Apotheke",
  "Supermarkt",
  "Reformhaus",
  "Veganes Restaurant",
  "Lieferservice",
  "Sonstiges",
];

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [stats, setStats] = useState({
    totalLoyaltyAccounts: 0,
    totalTransactions: 0,
    totalRewards: 0,
  });
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    industry: "",
    street: "",
    house_number: "",
    postal_code: "",
    city: "",
    phone: "",
    website: "",
    instagram: "",
    facebook: "",
    twitter: "",
    logo_url: "",
    cover_image_url: "",
    customer_number: null as number | null,
    created_at: "",
  });

  useEffect(() => {
    if (id) {
      loadCustomer();
      loadStats();
    }
  }, [id]);

  const loadCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Keine Daten gefunden");
      
      setFormData({
        name: data.name || "",
        description: data.description || "",
        industry: data.industry || "",
        street: data.street || "",
        house_number: data.house_number || "",
        postal_code: data.postal_code || "",
        city: data.city || "",
        phone: data.phone || "",
        website: data.website || "",
        instagram: data.instagram || "",
        facebook: data.facebook || "",
        twitter: data.twitter || "",
        logo_url: data.logo_url || "",
        cover_image_url: data.cover_image_url || "",
        customer_number: data.customer_number,
        created_at: data.created_at || "",
      });
    } catch (error: any) {
      toast.error("Kunde nicht gefunden");
      navigate("/admin/customers");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [loyaltyRes, transactionsRes, rewardsRes] = await Promise.all([
        supabase.from("loyalty_accounts").select("id", { count: "exact", head: true }).eq("merchant_customer_id", id),
        supabase.from("point_transactions").select("id", { count: "exact", head: true }).eq("merchant_customer_id", id),
        supabase.from("rewards").select("id", { count: "exact", head: true }).eq("merchant_customer_id", id),
      ]);

      setStats({
        totalLoyaltyAccounts: loyaltyRes.count || 0,
        totalTransactions: transactionsRes.count || 0,
        totalRewards: rewardsRes.count || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("Name ist Pflichtfeld");
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        name: formData.name,
        description: formData.description,
        industry: formData.industry,
        street: formData.street,
        house_number: formData.house_number,
        postal_code: formData.postal_code,
        city: formData.city,
        phone: formData.phone,
        website: formData.website,
        instagram: formData.instagram,
        facebook: formData.facebook,
        twitter: formData.twitter,
      };
      
      const { error } = await supabase
        .from("customers")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
      toast.success("Gespeichert");
    } catch (error: any) {
      toast.error("Fehler beim Speichern");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomer = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Kunde gelöscht");
      navigate("/admin/customers");
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Löschen");
      console.error(error);
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-sm text-muted-foreground">Laden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header - compact */}
      <div className="flex items-center gap-3 border-b pb-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/admin/customers")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{formData.name}</h1>
            {formData.customer_number && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">
                #{formData.customer_number}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Erstellt: {new Date(formData.created_at).toLocaleDateString("de-DE")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
            <Save className="w-3 h-3 mr-1" />
            {saving ? "..." : "Speichern"}
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="w-3 h-3 mr-1" />
            Löschen
          </Button>
        </div>
      </div>

      {/* Two Column Layout - like SAP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column - Stammdaten */}
        <div className="space-y-3">
          {/* Anschrift */}
          <fieldset className="border rounded p-3 space-y-2">
            <legend className="text-xs font-semibold px-1 text-muted-foreground">Anschrift</legend>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Firma *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Kategorie</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(value) => setFormData({ ...formData, industry: value })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label className="text-xs">Straße</Label>
                <Input
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Hausnr.</Label>
                <Input
                  value={formData.house_number}
                  onChange={(e) => setFormData({ ...formData, house_number: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">PLZ</Label>
                <Input
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Ort</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </fieldset>

          {/* Kommunikation */}
          <fieldset className="border rounded p-3 space-y-2">
            <legend className="text-xs font-semibold px-1 text-muted-foreground">Kommunikation</legend>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Telefon</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Website</Label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Instagram</Label>
                <Input
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Facebook</Label>
                <Input
                  value={formData.facebook}
                  onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </fieldset>

          {/* Beschreibung */}
          <fieldset className="border rounded p-3">
            <legend className="text-xs font-semibold px-1 text-muted-foreground">Beschreibung</legend>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="text-sm min-h-[60px]"
              rows={2}
            />
          </fieldset>
        </div>

        {/* Right Column - Kontodaten & Statistiken */}
        <div className="space-y-3">
          {/* Kundendaten */}
          <fieldset className="border rounded p-3 space-y-2">
            <legend className="text-xs font-semibold px-1 text-muted-foreground">Kundendaten</legend>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Kunden-Nr.</p>
                  <p className="font-mono font-semibold">{formData.customer_number || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">ID</p>
                  <p className="font-mono text-xs">{id ? id.substring(0, 8) + "..." : "—"}</p>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Statistiken */}
          <fieldset className="border rounded p-3">
            <legend className="text-xs font-semibold px-1 text-muted-foreground">Statistiken</legend>
            
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/30 rounded p-2">
                <p className="text-lg font-bold">{stats.totalLoyaltyAccounts}</p>
                <p className="text-[10px] text-muted-foreground">Nutzer</p>
              </div>
              <div className="bg-muted/30 rounded p-2">
                <p className="text-lg font-bold">{stats.totalTransactions}</p>
                <p className="text-[10px] text-muted-foreground">Transaktionen</p>
              </div>
              <div className="bg-muted/30 rounded p-2">
                <p className="text-lg font-bold">{stats.totalRewards}</p>
                <p className="text-[10px] text-muted-foreground">Belohnungen</p>
              </div>
            </div>
          </fieldset>

          {/* Zahlungsverlauf */}
          <fieldset className="border rounded p-3">
            <legend className="text-xs font-semibold px-1 text-muted-foreground">Zahlungsverlauf</legend>
            
            <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => toast.info("Stripe Dashboard öffnen...")}>
              <CreditCard className="w-3 h-3" />
              Zahlungen in Stripe anzeigen
            </Button>
          </fieldset>

          {/* Bestellverlauf */}
          <fieldset className="border rounded p-3">
            <legend className="text-xs font-semibold px-1 text-muted-foreground">Bestellverlauf</legend>
            
            <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => navigate("/admin/orders")}>
              <FileText className="w-3 h-3" />
              Bestellungen anzeigen
            </Button>
          </fieldset>

          {/* Vorschau */}
          <fieldset className="border rounded p-3">
            <legend className="text-xs font-semibold px-1 text-muted-foreground">Kunden-Dashboard</legend>
            
            <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => toast.info("Vorschau wird implementiert...")}>
              <ExternalLink className="w-3 h-3" />
              Dashboard ansehen
            </Button>
          </fieldset>

          {/* Media Preview */}
          {(formData.logo_url || formData.cover_image_url) && (
            <fieldset className="border rounded p-3">
              <legend className="text-xs font-semibold px-1 text-muted-foreground">Medien</legend>
              <div className="grid grid-cols-2 gap-2">
                {formData.logo_url && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Logo</p>
                    <img src={formData.logo_url} alt="Logo" className="h-12 object-contain rounded border bg-muted/30" />
                  </div>
                )}
                {formData.cover_image_url && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Cover</p>
                    <img src={formData.cover_image_url} alt="Cover" className="h-12 object-cover rounded border" />
                  </div>
                )}
              </div>
            </fieldset>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmActionDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteCustomer}
        title="Kunde endgültig löschen?"
        description={`"${formData.name}" wird mit allen zugehörigen Daten unwiderruflich gelöscht.`}
        confirmText={deleting ? "Wird gelöscht..." : "Löschen"}
        confirmPhrase="LÖSCHEN"
        destructive
      />
    </div>
  );
};

export default CustomerDetail;

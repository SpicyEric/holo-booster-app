import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { appSupabase } from "@/integrations/app-supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { ArrowLeft, Save, Trash2, Users, ExternalLink, Store } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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

// Categories from the merchant system
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
  const [confirmText, setConfirmText] = useState("");
  
  const [stats, setStats] = useState({
    totalLoyaltyAccounts: 0,
    totalTransactions: 0,
    totalRewards: 0,
  });
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    address: "",
    postal_code: "",
    city: "",
    phone_number: "",
    website: "",
    instagram_url: "",
    facebook_url: "",
    twitter_url: "",
    logo_url: "",
    cover_image_url: "",
    owner_user_id: "",
  });

  useEffect(() => {
    if (id) {
      loadMerchant();
      loadStats();
    }
  }, [id]);

  const loadMerchant = async () => {
    try {
      const { data, error } = await appSupabase
        .from("merchants")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Keine Daten gefunden");
      
      // Cast data to correct type
      const merchant = data as {
        name: string;
        description: string | null;
        category: string | null;
        address: string;
        postal_code: string | null;
        city: string;
        phone_number: string | null;
        website: string | null;
        instagram_url: string | null;
        facebook_url: string | null;
        twitter_url: string | null;
        logo_url: string | null;
        cover_image_url: string | null;
        owner_user_id: string | null;
      };
      
      setFormData({
        name: merchant.name || "",
        description: merchant.description || "",
        category: merchant.category || "",
        address: merchant.address || "",
        postal_code: merchant.postal_code || "",
        city: merchant.city || "",
        phone_number: merchant.phone_number || "",
        website: merchant.website || "",
        instagram_url: merchant.instagram_url || "",
        facebook_url: merchant.facebook_url || "",
        twitter_url: merchant.twitter_url || "",
        logo_url: merchant.logo_url || "",
        cover_image_url: merchant.cover_image_url || "",
        owner_user_id: merchant.owner_user_id || "",
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
        appSupabase.from("loyalty_accounts").select("id", { count: "exact", head: true }).eq("merchant_id", id),
        appSupabase.from("transactions").select("id", { count: "exact", head: true }).eq("merchant_id", id),
        appSupabase.from("rewards").select("id", { count: "exact", head: true }).eq("merchant_id", id),
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
    if (!formData.name || !formData.address || !formData.city) {
      toast.error("Name, Adresse und Stadt sind Pflichtfelder");
      return;
    }

    setSaving(true);
    try {
      // Use any cast for external DB type compatibility
      const updateData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        address: formData.address,
        postal_code: formData.postal_code,
        city: formData.city,
        phone_number: formData.phone_number,
        website: formData.website,
        instagram_url: formData.instagram_url,
        facebook_url: formData.facebook_url,
        twitter_url: formData.twitter_url,
      };
      
      const { error } = await (appSupabase
        .from("merchants") as any)
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
      toast.success("Kunde erfolgreich gespeichert");
    } catch (error: any) {
      toast.error("Fehler beim Speichern");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMerchant = async () => {
    if (confirmText.toLowerCase() !== "löschen") {
      toast.error('Bitte gib "löschen" ein, um fortzufahren');
      return;
    }
    
    setDeleting(true);
    try {
      const { error } = await appSupabase
        .from("merchants")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Kunde erfolgreich gelöscht");
      navigate("/admin/customers");
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Löschen des Kunden");
      console.error(error);
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-16 h-16 rounded-full bg-gradient-primary animate-pulse-glow" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/admin/customers")}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {formData.name}
          </h1>
          <p className="text-muted-foreground mt-1">Kundendetails bearbeiten</p>
        </div>
        {formData.owner_user_id && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Owner ID</p>
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {formData.owner_user_id.substring(0, 8)}...
            </code>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Statistics */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5" />
                Statistiken
              </h2>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Stempelkartennutzer</p>
                <p className="text-2xl font-bold">{stats.totalLoyaltyAccounts}</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Transaktionen</p>
                <p className="text-2xl font-bold">{stats.totalTransactions}</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Aktive Belohnungen</p>
                <p className="text-2xl font-bold">{stats.totalRewards}</p>
              </div>
            </div>
          </GlassCard>

          {/* Basic Data */}
          <GlassCard>
            <h2 className="text-xl font-bold mb-4">Grunddaten</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Firmenname *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. Bäckerei Müller"
                />
              </div>

              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Kurze Beschreibung des Geschäfts..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="category">Kategorie</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kategorie wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </GlassCard>

          {/* Address */}
          <GlassCard>
            <h2 className="text-xl font-bold mb-4">Adresse</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="address">Straße und Hausnummer *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Musterstraße 123"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postal_code">PLZ</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    placeholder="12345"
                  />
                </div>
                <div>
                  <Label htmlFor="city">Stadt *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Musterstadt"
                  />
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Contact */}
          <GlassCard>
            <h2 className="text-xl font-bold mb-4">Kontaktdaten</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="phone_number">Telefonnummer</Label>
                <Input
                  id="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="+49 123 456789"
                />
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://www.beispiel.de"
                />
              </div>

              <div>
                <Label htmlFor="instagram_url">Instagram</Label>
                <Input
                  id="instagram_url"
                  value={formData.instagram_url}
                  onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                  placeholder="https://instagram.com/beispiel"
                />
              </div>

              <div>
                <Label htmlFor="facebook_url">Facebook</Label>
                <Input
                  id="facebook_url"
                  value={formData.facebook_url}
                  onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                  placeholder="https://facebook.com/beispiel"
                />
              </div>
            </div>
          </GlassCard>

          <div className="flex justify-between">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Kunde löschen
            </Button>
            
            <GradientButton onClick={handleSave} disabled={saving} icon={Save}>
              {saving ? "Speichern..." : "Änderungen speichern"}
            </GradientButton>
          </div>
        </div>

        {/* Sidebar - Preview & Info */}
        <div className="space-y-6">
          {/* Logo Preview */}
          <GlassCard>
            <h2 className="text-xl font-bold mb-4">Logo</h2>
            {formData.logo_url ? (
              <img
                src={formData.logo_url}
                alt="Logo"
                className="w-full rounded-lg mb-4 max-h-48 object-contain bg-muted/30"
              />
            ) : (
              <div className="w-full h-32 rounded-lg bg-muted/30 flex items-center justify-center mb-4">
                <Store className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center">
              Logo wird vom Kunden selbst in seinem Dashboard hochgeladen
            </p>
          </GlassCard>

          {/* Cover Image Preview */}
          <GlassCard>
            <h2 className="text-xl font-bold mb-4">Titelbild</h2>
            {formData.cover_image_url ? (
              <img
                src={formData.cover_image_url}
                alt="Titelbild"
                className="w-full rounded-lg mb-4 max-h-32 object-cover"
              />
            ) : (
              <div className="w-full h-24 rounded-lg bg-muted/30 flex items-center justify-center mb-4">
                <p className="text-sm text-muted-foreground">Kein Titelbild</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center">
              Titelbild wird vom Kunden selbst hochgeladen
            </p>
          </GlassCard>

          {/* Merchant Dashboard Link */}
          <GlassCard>
            <h2 className="text-xl font-bold mb-4">Kunden-Ansicht</h2>
            <p className="text-sm text-muted-foreground mb-4">
              So sieht der Kunde sein eigenes Dashboard, wenn er angemeldet ist.
            </p>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                // Open merchant preview - this would need to be implemented
                toast.info("Vorschau-Funktion wird noch implementiert");
              }}
            >
              <ExternalLink className="w-4 h-4" />
              Händler-Dashboard ansehen
            </Button>
          </GlassCard>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Kunde wirklich löschen?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Diese Aktion kann nicht rückgängig gemacht werden. Der Kunde{" "}
                <strong>{formData.name}</strong> und alle zugehörigen Daten werden permanent gelöscht.
              </p>
              <div className="pt-2">
                <Label htmlFor="confirm-delete">
                  Tippe <span className="font-bold">"löschen"</span> ein, um fortzufahren:
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="löschen"
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText("")}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMerchant}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Lösche..." : "Endgültig löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomerDetail;
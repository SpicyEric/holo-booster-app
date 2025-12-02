import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const CustomerNew = () => {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    description: "",
    street: "",
    house_number: "",
    postal_code: "",
    city: "",
    phone: "",
    website: "",
    instagram: "",
    facebook: "",
  });

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error("Name ist Pflichtfeld");
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          name: formData.name,
          industry: formData.industry || null,
          description: formData.description || null,
          street: formData.street || null,
          house_number: formData.house_number || null,
          postal_code: formData.postal_code || null,
          city: formData.city || null,
          phone: formData.phone || null,
          website: formData.website || null,
          instagram: formData.instagram || null,
          facebook: formData.facebook || null,
          google_review_url: "",
          offer_text: "",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Kunde erfolgreich angelegt");
      navigate(`/admin/customers/${data.id}`);
    } catch (error: any) {
      toast.error("Fehler beim Anlegen des Kunden: " + error.message);
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/admin/customers")}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Neuer Kunde
          </h1>
          <p className="text-muted-foreground mt-1">
            Lege einen neuen Kunden an
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <GlassCard>
          <h2 className="text-xl font-bold mb-4">Grunddaten</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Firmenname *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="z.B. Bäckerei Müller"
                />
              </div>
              <div>
                <Label htmlFor="industry">Kategorie</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(value) => setFormData({ ...formData, industry: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label htmlFor="street">Straße</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) =>
                    setFormData({ ...formData, street: e.target.value })
                  }
                  placeholder="z.B. Hauptstraße"
                />
              </div>
              <div>
                <Label htmlFor="house_number">Hausnr.</Label>
                <Input
                  id="house_number"
                  value={formData.house_number}
                  onChange={(e) =>
                    setFormData({ ...formData, house_number: e.target.value })
                  }
                  placeholder="15"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="postal_code">PLZ</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) =>
                    setFormData({ ...formData, postal_code: e.target.value })
                  }
                  placeholder="12345"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="city">Stadt</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder="z.B. Frankfurt"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Telefonnummer</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+49 123 456789"
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                  placeholder="https://www.beispiel.de"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={formData.instagram}
                  onChange={(e) =>
                    setFormData({ ...formData, instagram: e.target.value })
                  }
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div>
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  value={formData.facebook}
                  onChange={(e) =>
                    setFormData({ ...formData, facebook: e.target.value })
                  }
                  placeholder="https://facebook.com/..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Kurze Beschreibung des Geschäfts..."
                rows={3}
              />
            </div>
          </div>
        </GlassCard>

        <div className="flex justify-end mt-6">
          <GradientButton
            onClick={handleCreate}
            disabled={creating}
            icon={Plus}
          >
            {creating ? "Erstelle..." : "Kunde anlegen"}
          </GradientButton>
        </div>
      </div>
    </div>
  );
};

export default CustomerNew;

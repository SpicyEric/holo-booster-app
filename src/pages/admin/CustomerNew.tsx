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

const CustomerNew = () => {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    google_review_url: "",
    offer_text: "",
    offer_title: "Nur noch ein Schritt zu deinem Geschenk",
    offer_details: "",
  });

  const handleCreate = async () => {
    if (!formData.name || !formData.google_review_url) {
      toast.error("Name und Google Review URL sind Pflichtfelder");
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          name: formData.name,
          google_review_url: formData.google_review_url,
          offer_text: formData.offer_text,
          offer_title: formData.offer_title,
          offer_details: formData.offer_details,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Kunde erfolgreich angelegt");
      navigate(`/admin/customers/${data.id}`);
    } catch (error: any) {
      toast.error("Fehler beim Anlegen des Kunden");
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
            <div>
              <Label htmlFor="name">Kundenname *</Label>
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
              <Label htmlFor="google_review_url">Google Review URL *</Label>
              <Input
                id="google_review_url"
                value={formData.google_review_url}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    google_review_url: e.target.value,
                  })
                }
                placeholder="https://g.page/r/..."
              />
            </div>

            <div>
              <Label htmlFor="offer_title">Überschrift auf Scan-Seite</Label>
              <Input
                id="offer_title"
                value={formData.offer_title}
                onChange={(e) =>
                  setFormData({ ...formData, offer_title: e.target.value })
                }
                placeholder="Nur noch ein Schritt zu deinem Geschenk"
              />
            </div>

            <div>
              <Label htmlFor="offer_text">Gutschein-Text (kurz)</Label>
              <Input
                id="offer_text"
                value={formData.offer_text}
                onChange={(e) =>
                  setFormData({ ...formData, offer_text: e.target.value })
                }
                placeholder="1x Gratis-Kaffee"
              />
            </div>

            <div>
              <Label htmlFor="offer_details">Detailbeschreibung</Label>
              <Textarea
                id="offer_details"
                value={formData.offer_details}
                onChange={(e) =>
                  setFormData({ ...formData, offer_details: e.target.value })
                }
                placeholder="Nach deiner Registrierung erhältst du einen Gutschein für..."
                rows={4}
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

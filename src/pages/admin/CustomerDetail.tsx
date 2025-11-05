import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { ArrowLeft, Save, QrCode, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { QRCodeSVG } from "qrcode.react";

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qrRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    google_review_url: "",
    offer_text: "",
    offer_title: "Nur noch ein Schritt zu deinem Geschenk",
    offer_details: "",
    logo_url: "",
    qr_code_url: "",
    active: true,
  });

  useEffect(() => {
    if (id) loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setFormData(data);
    } catch (error: any) {
      toast.error("Kunde nicht gefunden");
      navigate("/admin/customers");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.google_review_url) {
      toast.error("Name und Google Review URL sind Pflichtfelder");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("customers")
        .update({
          name: formData.name,
          google_review_url: formData.google_review_url,
          offer_text: formData.offer_text,
          offer_title: formData.offer_title,
          offer_details: formData.offer_details,
          logo_url: formData.logo_url,
          active: formData.active,
        })
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${id}-logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("customer-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("customer-assets")
        .getPublicUrl(filePath);

      setFormData({ ...formData, logo_url: publicUrl });
      
      // Direkt in DB speichern
      await supabase
        .from("customers")
        .update({ logo_url: publicUrl })
        .eq("id", id);

      toast.success("Logo hochgeladen");
    } catch (error: any) {
      toast.error("Fehler beim Upload");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const generateQRCode = async () => {
    try {
      const canvas = qrRef.current?.querySelector("canvas");
      if (!canvas) return;

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const fileName = `${id}-qr-${Date.now()}.png`;
        const filePath = `qrcodes/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("customer-assets")
          .upload(filePath, blob);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("customer-assets")
          .getPublicUrl(filePath);

        await supabase
          .from("customers")
          .update({ qr_code_url: publicUrl })
          .eq("id", id);

        setFormData({ ...formData, qr_code_url: publicUrl });
        toast.success("QR-Code generiert und gespeichert");
      });
    } catch (error: any) {
      toast.error("Fehler beim Generieren des QR-Codes");
      console.error(error);
    }
  };

  const downloadQRCode = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${formData.name}-QR-Code.png`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-16 h-16 rounded-full bg-gradient-primary animate-pulse-glow" />
      </div>
    );
  }

  const qrCodeUrl = `${window.location.origin}/s/${id}`;

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
            {formData.name}
          </h1>
          <p className="text-muted-foreground mt-1">Kundendetails bearbeiten</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hauptdaten */}
        <div className="lg:col-span-2 space-y-6">
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

              <div className="flex items-center justify-between">
                <Label htmlFor="active">Kunde aktiv</Label>
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, active: checked })
                  }
                />
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="text-xl font-bold mb-4">Angebot & Texte</h2>
            <div className="space-y-4">
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
                  value={formData.offer_details || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, offer_details: e.target.value })
                  }
                  placeholder="Nach deiner Registrierung erhältst du einen Gutschein für..."
                  rows={4}
                />
              </div>
            </div>
          </GlassCard>

          <div className="flex justify-end">
            <GradientButton onClick={handleSave} disabled={saving} icon={Save}>
              {saving ? "Speichern..." : "Änderungen speichern"}
            </GradientButton>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <GlassCard>
            <h2 className="text-xl font-bold mb-4">Logo</h2>
            {formData.logo_url && (
              <img
                src={formData.logo_url}
                alt="Logo"
                className="w-full rounded-lg mb-4"
              />
            )}
            <label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <div className="w-full cursor-pointer px-4 py-2 bg-background/50 hover:bg-background border border-border rounded-lg transition-colors text-center flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" />
                {uploading ? "Hochladen..." : "Logo hochladen"}
              </div>
            </label>
          </GlassCard>

          <GlassCard>
            <h2 className="text-xl font-bold mb-4">QR-Code</h2>
            
            <div ref={qrRef} className="mb-4 bg-white p-4 rounded-lg">
              <QRCodeSVG value={qrCodeUrl} size={200} level="H" className="mx-auto" />
            </div>

            <div className="space-y-2">
              {!formData.qr_code_url ? (
                <GradientButton onClick={generateQRCode} icon={QrCode} className="w-full">
                  QR-Code generieren & speichern
                </GradientButton>
              ) : (
                <>
                  <button
                    onClick={downloadQRCode}
                    className="w-full px-4 py-2 bg-background/50 hover:bg-background border border-border rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    QR-Code herunterladen
                  </button>
                  <GradientButton onClick={generateQRCode} icon={QrCode} className="w-full">
                    QR-Code neu generieren
                  </GradientButton>
                </>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Führt zu: /s/{id}
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;

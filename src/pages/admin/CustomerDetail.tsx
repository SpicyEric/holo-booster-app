import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { ArrowLeft, Save, QrCode, Upload, Download, AlertTriangle, XCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { QRCodeSVG } from "qrcode.react";
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

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qrRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generatingDesigns, setGeneratingDesigns] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    company_name: "",
    industry: "",
    contact_person: "",
    phone: "",
    email: "",
    google_review_url: "",
    offer_text: "",
    offer_title: "Nur noch ein Schritt bis zu deinem Geschenk",
    offer_details: "",
    logo_url: "",
    qr_code_url: "",
    design_urls: [] as string[],
    active: true,
    stripe_customer_id: "",
    stripe_subscription_id: "",
    status: "",
    stamps_required: 5,
    stamp_reward_text: "Gratis Kaffee",
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
    if (!formData.company_name || !formData.google_review_url) {
      toast.error("Firmenname und Google Review URL sind Pflichtfelder");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("customers")
        .update({
          name: formData.company_name,
          company_name: formData.company_name,
          industry: formData.industry,
          contact_person: formData.contact_person,
          phone: formData.phone,
          email: formData.email,
          google_review_url: formData.google_review_url,
          offer_text: formData.offer_text,
          offer_title: formData.offer_title,
          offer_details: formData.offer_details,
          logo_url: formData.logo_url,
          active: formData.active,
          stamps_required: formData.stamps_required,
          stamp_reward_text: formData.stamp_reward_text,
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

  const generateQRCode = async (isRegeneration = false) => {
    try {
      // Erstelle einen temporären Container für die QR-Code-Generierung
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      document.body.appendChild(tempContainer);

      // Importiere QRCode dynamisch für Canvas-Rendering
      const QRCode = (await import('qrcode')).default;
      const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl, {
        width: 512,
        margin: 2,
        errorCorrectionLevel: 'H'
      });

      // Konvertiere Base64 zu Blob
      const response = await fetch(qrCodeDataUrl);
      const blob = await response.blob();

      const fileName = `${id}-qr-${Date.now()}.png`;
      const filePath = `qrcodes/${fileName}`;

      // Wenn es eine Regenerierung ist, lösche alten QR-Code
      if (isRegeneration && formData.qr_code_url) {
        const oldPath = formData.qr_code_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from("customer-assets")
            .remove([`qrcodes/${oldPath}`]);
        }
      }

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
      document.body.removeChild(tempContainer);
      
      toast.success(isRegeneration ? "Neuer QR-Code generiert" : "QR-Code generiert und gespeichert");
    } catch (error: any) {
      toast.error("Fehler beim Generieren des QR-Codes");
      console.error(error);
    }
  };

  const handleRegenerateConfirm = () => {
    if (confirmText.toLowerCase() === "sicher") {
      generateQRCode(true);
      setShowRegenerateDialog(false);
      setConfirmText("");
    } else {
      toast.error('Bitte gib "Sicher" ein, um fortzufahren');
    }
  };

  const downloadQRCode = async () => {
    if (!formData.qr_code_url) {
      toast.error("Kein QR-Code verfügbar");
      return;
    }

    try {
      const response = await fetch(formData.qr_code_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${formData.company_name}-QR-Code.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("QR-Code heruntergeladen");
    } catch (error) {
      toast.error("Fehler beim Download");
      console.error(error);
    }
  };

  const generateStandDesigns = async () => {
    if (!formData.qr_code_url) {
      toast.error('Bitte generiere zuerst einen QR-Code');
      return;
    }

    setGeneratingDesigns(true);
    try {
      const { data, error } = await supabase.functions.invoke('generateStandDesigns', {
        body: { customerId: id },
      });

      if (error) throw error;

      if (data.needsTemplate) {
        toast.error('Template fehlt! Bitte lade in den Einstellungen ein Base-Template hoch.');
        return;
      }

      if (data.designUrls && data.designUrls.length > 0) {
        setFormData({ ...formData, design_urls: data.designUrls });
        await loadCustomer();
        toast.success('Design erfolgreich erstellt! 🎨');
      } else {
        toast.error('Keine Designs konnten erstellt werden');
      }
    } catch (error: any) {
      toast.error('Fehler beim Generieren der Designs');
      console.error(error);
    } finally {
      setGeneratingDesigns(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const { error } = await supabase.functions.invoke('admin-cancel-subscription', {
        body: { customerId: id },
      });

      if (error) throw error;

      toast.success("Abo erfolgreich gekündigt");
      await loadCustomer();
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Kündigen des Abos");
      console.error(error);
    } finally {
      setCancelling(false);
      setShowCancelDialog(false);
    }
  };

  const handleDeleteCustomer = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('admin-delete-customer', {
        body: { customerId: id },
      });

      if (error) throw error;

      toast.success("Kunde und alle Stripe-Daten erfolgreich gelöscht");
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
          {/* Zahlungsinformationen */}
          <GlassCard>
            <h2 className="text-xl font-bold mb-4">Zahlungsinformationen</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Stripe Customer ID</p>
                  <p className="font-mono text-sm">
                    {formData.stripe_customer_id || "Nicht angelegt"}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Subscription ID</p>
                  <p className="font-mono text-sm">
                    {formData.stripe_subscription_id || "Kein Abo"}
                  </p>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Zahlungsstatus</p>
                <p className="font-semibold">
                  {formData.status === "active" && "✅ Aktiv"}
                  {formData.status === "pending" && "⏳ Ausstehend"}
                  {formData.status === "past_due" && "⚠️ Überfällig"}
                  {formData.status === "canceled" && "❌ Gekündigt"}
                  {!formData.status && "— Nicht definiert"}
                </p>
              </div>

              {/* Admin Actions */}
              {formData.stripe_subscription_id && formData.status !== "canceled" && (
                <div className="pt-4 border-t">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowCancelDialog(true)}
                      variant="destructive"
                      className="gap-2"
                      disabled={cancelling}
                    >
                      <XCircle className="w-4 h-4" />
                      {cancelling ? "Kündige..." : "Abo kündigen"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Kündigt das Abo sofort in Stripe und in der Datenbank
                  </p>
                </div>
              )}

              {formData.stripe_customer_id && (
                <div className="pt-4 border-t">
                  <Button
                    onClick={() => setShowDeleteDialog(true)}
                    variant="destructive"
                    className="gap-2"
                    disabled={deleting}
                  >
                    <Trash2 className="w-4 h-4" />
                    {deleting ? "Lösche..." : "Kunde komplett löschen"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    ⚠️ Löscht Kunde aus Stripe UND Datenbank (inkl. Abo)
                  </p>
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="text-xl font-bold mb-4">Grunddaten</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="company_name">Firmenname *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) =>
                    setFormData({ ...formData, company_name: e.target.value })
                  }
                  placeholder="z.B. Bäckerei Müller"
                />
              </div>

              <div>
                <Label htmlFor="industry">Branche</Label>
                <Input
                  id="industry"
                  value={formData.industry || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, industry: e.target.value })
                  }
                  placeholder="z.B. Gastronomie, Einzelhandel"
                />
              </div>

              <div>
                <Label htmlFor="contact_person">Ansprechpartner</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_person: e.target.value })
                  }
                  placeholder="Max Mustermann"
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefonnummer</Label>
                <Input
                  id="phone"
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+49 123 456789"
                />
              </div>

              <div>
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="info@firma.de"
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
                  placeholder="Erhalte 10% Rabatt auf dein nächstes Getränk"
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
                  placeholder="Zeige diesen Gutschein einfach an der Kasse vor und erhalte deinen Rabatt. Gültig für 15 Minuten nach Erhalt."
                  rows={4}
                />
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="text-xl font-bold mb-4">Stempelkarten-System</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="stamps_required">Anzahl Stempel bis zur Belohnung</Label>
                <Input
                  id="stamps_required"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.stamps_required}
                  onChange={(e) =>
                    setFormData({ ...formData, stamps_required: parseInt(e.target.value) || 5 })
                  }
                  placeholder="5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Wie viele Besuche braucht ein Kunde, um eine Belohnung zu erhalten?
                </p>
              </div>

              <div>
                <Label htmlFor="stamp_reward_text">Belohnungs-Text</Label>
                <Input
                  id="stamp_reward_text"
                  value={formData.stamp_reward_text}
                  onChange={(e) =>
                    setFormData({ ...formData, stamp_reward_text: e.target.value })
                  }
                  placeholder="Gratis Kaffee"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Was bekommt der Kunde, wenn die Stempelkarte voll ist?
                </p>
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
                <GradientButton onClick={() => generateQRCode(false)} icon={QrCode} className="w-full">
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
                  
                  <a
                    href={qrCodeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg transition-colors flex items-center justify-center gap-2 text-primary"
                  >
                    Test-Link öffnen
                  </a>

                  <button
                    onClick={() => setShowRegenerateDialog(true)}
                    className="w-full px-4 py-2 bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 rounded-lg transition-colors flex items-center justify-center gap-2 text-destructive"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Neuen QR-Code generieren
                  </button>
                </>
              )}
            </div>

            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Volle URL:</p>
              <p className="text-xs font-mono break-all">{qrCodeUrl}</p>
            </div>
          </GlassCard>

          {/* Aufsteller-Designs */}
          <GlassCard>
            <h2 className="text-xl font-bold mb-4">Aufsteller-Designs</h2>

            {formData.design_urls && formData.design_urls.length > 0 && (
              <div className="grid grid-cols-1 gap-4 mb-4">
                {formData.design_urls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Design ${index + 1}`}
                      className="w-full rounded-lg border border-border"
                    />
                    <a
                      href={url}
                      download={`${formData.company_name || formData.name}-Design-${index + 1}.png`}
                      className="absolute top-2 right-2 p-2 bg-background/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}

            <GradientButton
              onClick={generateStandDesigns}
              disabled={generatingDesigns || !formData.qr_code_url}
              className="w-full"
            >
              {generatingDesigns ? "Generiere Design..." : "Aufsteller Design erstellen"}
            </GradientButton>

            {!formData.qr_code_url && (
              <p className="text-sm text-muted-foreground mt-2">
                ⚠️ QR-Code muss zuerst generiert werden
              </p>
            )}
          </GlassCard>
        </div>
      </div>

      <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              QR-Code wirklich neu generieren?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-semibold">
                ⚠️ ACHTUNG: Der alte QR-Code wird dadurch ungültig!
              </p>
              <p>
                Falls der Kunde bereits gedruckte Aufsteller mit dem alten QR-Code hat,
                funktionieren diese nicht mehr.
              </p>
              <div className="pt-2">
                <Label htmlFor="confirm-text">
                  Tippe <span className="font-bold">"Sicher"</span> ein, um fortzufahren:
                </Label>
                <Input
                  id="confirm-text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Sicher"
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
              onClick={handleRegenerateConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Code ändern
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abo wirklich kündigen?</AlertDialogTitle>
            <AlertDialogDescription>
              Das Abo wird sofort in Stripe gekündigt und der Status wird auf "canceled" gesetzt.
              Der Kunde kann die Dienste nicht mehr nutzen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Abo kündigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Customer Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Kunde komplett löschen?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold text-destructive">
                ACHTUNG: Diese Aktion kann nicht rückgängig gemacht werden!
              </p>
              <p>Folgendes wird gelöscht:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Kunde in Stripe (inkl. aller Zahlungsdaten)</li>
                <li>Subscription in Stripe (falls vorhanden)</li>
                <li>Kundendaten in der Datenbank</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomerDetail;

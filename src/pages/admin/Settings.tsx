import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Image } from "lucide-react";
import { Label } from "@/components/ui/label";

const Settings = () => {
  const [uploading, setUploading] = useState(false);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("customer-assets")
        .upload('base-template.png', file, {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("customer-assets")
        .getPublicUrl('base-template.png');

      setTemplateUrl(publicUrl);
      toast.success("Base-Template erfolgreich hochgeladen! 🎉");
    } catch (error: any) {
      toast.error("Fehler beim Upload");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Einstellungen
        </h1>
        <p className="text-muted-foreground mt-1">System-Einstellungen verwalten</p>
      </div>

      <GlassCard>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Image className="w-5 h-5" />
          Design-Template
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Lade dein eigenes DIN A5 Template für die automatische Flyer-Generierung hoch.
          Das Template wird für alle Kunden verwendet.
        </p>

        <div className="space-y-4">
          {templateUrl && (
            <div className="border border-border rounded-lg p-4">
              <img src={templateUrl} alt="Current Template" className="w-full max-w-md mx-auto" />
              <p className="text-xs text-muted-foreground text-center mt-2">
                Aktuelles Template
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="template-upload">Base-Template hochladen (PNG empfohlen)</Label>
            <label htmlFor="template-upload">
              <input
                id="template-upload"
                type="file"
                accept="image/png,image/jpg,image/jpeg"
                onChange={handleTemplateUpload}
                className="hidden"
              />
              <div className="mt-2 w-full cursor-pointer px-4 py-3 bg-background/50 hover:bg-background border-2 border-dashed border-border hover:border-primary rounded-lg transition-all text-center flex items-center justify-center gap-2">
                <Upload className="w-5 h-5" />
                <span>{uploading ? "Hochladen..." : "Template auswählen"}</span>
              </div>
            </label>
          </div>

          <div className="bg-muted/30 p-4 rounded-lg space-y-2 text-sm">
            <p className="font-semibold">💡 Hinweis:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Format: DIN A5 (148mm x 210mm) oder 1748px x 2480px</li>
              <li>QR-Code Position: x=130, y=1100 (von oben)</li>
              <li>Logo Position: x=100, y=100 (von oben)</li>
              <li>Text Position: x=874, y=380 (von oben)</li>
            </ul>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default Settings;

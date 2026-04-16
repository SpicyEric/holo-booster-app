import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, FileCheck, Calendar, Globe } from "lucide-react";
import { toast } from "sonner";

export default function SalesRepMeinVertrag() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("sales_rep_profiles" as any)
      .select("*")
      .eq("user_id", user!.id)
      .single();
    setProfile(data);
    setLoading(false);
  };

  const handleDownload = async () => {
    if (!profile?.vertrag_pdf_url) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from("vertraege")
        .createSignedUrl(profile.vertrag_pdf_url, 60);
      if (error) throw error;

      // Force download
      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = `Vertriebspartnervertrag_PID-${profile.employee_number || "VP"}.pdf`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      toast.error("Download fehlgeschlagen: " + (err.message || "Unbekannter Fehler"));
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile?.vertrag_angenommen_am) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Mein Vertrag</h1>
        <GlassCard className="p-8 text-center space-y-4">
          <FileCheck className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Du hast deinen Vertrag noch nicht angenommen.</p>
          <Button onClick={() => window.location.href = "/vertriebler/vertrag"}>
            Jetzt Vertrag annehmen
          </Button>
        </GlassCard>
      </div>
    );
  }

  const angenommenAm = new Date(profile.vertrag_angenommen_am);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mein Vertrag</h1>
        <p className="text-sm text-muted-foreground mt-1">Dein Vertriebspartnervertrag mit ELOYO</p>
      </div>

      <GlassCard className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg">Vertriebspartnervertrag</h2>
            <p className="text-sm text-muted-foreground">Freier Kooperationsvertrag</p>
          </div>
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <FileCheck className="w-3 h-3 mr-1" />
            Angenommen
          </Badge>
        </div>

        <div className="grid gap-3 text-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>
              Angenommen am{" "}
              <strong className="text-foreground">
                {angenommenAm.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
              </strong>
              {" "}um{" "}
              <strong className="text-foreground">
                {angenommenAm.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Globe className="w-4 h-4 shrink-0" />
            <span>IP-Adresse: <strong className="text-foreground">{profile.vertrag_ip || "—"}</strong></span>
          </div>
        </div>

        <Button onClick={handleDownload} disabled={downloading} className="w-full">
          {downloading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Wird heruntergeladen...</>
          ) : (
            <><Download className="w-4 h-4 mr-2" />Vertrag herunterladen</>
          )}
        </Button>
      </GlassCard>
    </div>
  );
}

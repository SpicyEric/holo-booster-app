import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, FileCheck, Calendar, AlertTriangle, FileText } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  employee_number: string | null;
  vertrag_angenommen_am: string | null;
  vertrag_pdf_url: string | null;
  vertrag_version: string | null;
  vertrag_outdated: boolean | null;
  vertrag_outdated_seit: string | null;
  contract_status: string | null;
}

interface Zusatz {
  id: string;
  titel: string;
  beschreibung: string | null;
  pdf_url: string;
  pflicht: boolean;
  status?: "ausstehend" | "angenommen";
  angenommen_am?: string | null;
  signed_pdf_url?: string | null;
}

export default function SalesRepMeinVertrag() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [zusatzList, setZusatzList] = useState<Zusatz[]>([]);
  const [activeVersion, setActiveVersion] = useState<{ version: string; titel: string } | null>(null);
  const [signingZusatz, setSigningZusatz] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: prof }, { data: ver }, { data: zusatz }, { data: zusatzMine }] = await Promise.all([
      (supabase.from("sales_rep_profiles") as any).select("*").eq("user_id", user!.id).single(),
      (supabase.from("vertrag_versionen") as any).select("version, titel").eq("ist_aktiv", true).maybeSingle(),
      (supabase.from("zusatzvereinbarungen") as any).select("*").eq("ist_aktiv", true).order("created_at", { ascending: false }),
      (supabase.from("vertriebler_zusatzvereinbarungen") as any).select("*").eq("user_id", user!.id),
    ]);

    setProfile(prof);
    setActiveVersion(ver);

    const merged: Zusatz[] = (zusatz || []).map((z: any) => {
      const mine = (zusatzMine || []).find((m: any) => m.vereinbarung_id === z.id);
      return {
        ...z,
        status: mine?.status || "ausstehend",
        angenommen_am: mine?.angenommen_am || null,
        signed_pdf_url: mine?.pdf_url || null,
      };
    });
    setZusatzList(merged);
    setLoading(false);
  };

  const downloadFromBucket = async (bucket: string, path: string, filename: string) => {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error) throw error;
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadVertrag = async () => {
    if (!profile?.vertrag_pdf_url) return;
    setDownloading(true);
    try {
      await downloadFromBucket(
        "vertraege",
        profile.vertrag_pdf_url,
        `Vertriebspartnervertrag_PID-${profile.employee_number || "VP"}.pdf`
      );
    } catch (err: any) {
      toast.error("Download fehlgeschlagen: " + (err.message || "Unbekannter Fehler"));
    } finally {
      setDownloading(false);
    }
  };

  const handleSignZusatz = async (id: string) => {
    setSigningZusatz(id);
    try {
      const { data, error } = await supabase.functions.invoke("sign-zusatzvereinbarung", {
        body: { vereinbarung_id: id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Zusatzvereinbarung angenommen");
      await loadAll();
    } catch (err: any) {
      toast.error("Annahme fehlgeschlagen: " + (err.message || "Unbekannter Fehler"));
    } finally {
      setSigningZusatz(null);
    }
  };

  const handleDownloadZusatz = async (z: Zusatz) => {
    try {
      const path = z.signed_pdf_url || z.pdf_url;
      const bucket = z.signed_pdf_url ? "vertraege" : "vertraege-vorlagen";
      await downloadFromBucket(bucket, path, `${z.titel.replace(/[^\w-]+/g, "_")}.pdf`);
    } catch (err: any) {
      toast.error("Download fehlgeschlagen: " + (err.message || "Unbekannter Fehler"));
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
          <Button onClick={() => navigate("/vertriebler/vertrag")}>
            Jetzt Vertrag öffnen
          </Button>
        </GlassCard>
      </div>
    );
  }

  const angenommenAm = new Date(profile.vertrag_angenommen_am);
  const isOutdated = !!profile.vertrag_outdated;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mein Vertrag</h1>
        <p className="text-sm text-muted-foreground mt-1">Dein Vertriebspartnervertrag mit ELOYO</p>
      </div>

      {/* Outdated banner */}
      {isOutdated && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">
              Dein Vertrag wurde aktualisiert. Bitte nimm die neue Version innerhalb von 30 Tagen an.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Wird die neue Version nicht innerhalb der Frist angenommen, werden Boxenbestellung und Auszahlung gesperrt.
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="mt-3"
              onClick={() => navigate("/vertriebler/vertrag")}
            >
              Zum Vertrag →
            </Button>
          </div>
        </div>
      )}

      {/* Hauptvertrag-Karte */}
      <GlassCard className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-lg">Vertriebspartnervertrag</h2>
            <p className="text-sm text-muted-foreground">
              Version {profile.vertrag_version || activeVersion?.version || "—"}
              {activeVersion?.titel ? ` · ${activeVersion.titel}` : ""}
            </p>
          </div>
          <Badge className={isOutdated
            ? "bg-orange-100 text-orange-800 hover:bg-orange-100"
            : "bg-green-100 text-green-800 hover:bg-green-100"
          }>
            <FileCheck className="w-3 h-3 mr-1" />
            {isOutdated ? "Aktualisierung nötig" : "Angenommen"}
          </Badge>
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
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

        <Button onClick={handleDownloadVertrag} disabled={downloading || !profile.vertrag_pdf_url} className="w-full">
          {downloading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Wird heruntergeladen...</>
          ) : (
            <><Download className="w-4 h-4 mr-2" />Vertrag herunterladen</>
          )}
        </Button>
      </GlassCard>

      {/* Zusatzvereinbarungen */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Zusatzvereinbarungen</h2>
        {zusatzList.length === 0 ? (
          <GlassCard className="p-6 text-center">
            <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Keine weiteren Vereinbarungen vorhanden.</p>
          </GlassCard>
        ) : (
          zusatzList.map((z) => {
            const accepted = z.status === "angenommen";
            return (
              <GlassCard key={z.id} className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{z.titel}</h3>
                    {z.beschreibung && (
                      <p className="text-sm text-muted-foreground mt-1">{z.beschreibung}</p>
                    )}
                  </div>
                  <Badge className={accepted
                    ? "bg-green-100 text-green-800 hover:bg-green-100"
                    : "bg-orange-100 text-orange-800 hover:bg-orange-100"
                  }>
                    {accepted ? "Angenommen" : z.pflicht ? "Pflicht – ausstehend" : "Ausstehend"}
                  </Badge>
                </div>

                {accepted && z.angenommen_am && (
                  <p className="text-xs text-muted-foreground">
                    Angenommen am {new Date(z.angenommen_am).toLocaleDateString("de-DE")}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadZusatz(z)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {accepted ? "Unterzeichnete Version" : "Vorschau"}
                  </Button>
                  {!accepted && (
                    <Button
                      size="sm"
                      onClick={() => handleSignZusatz(z.id)}
                      disabled={signingZusatz === z.id}
                    >
                      {signingZusatz === z.id ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Wird angenommen...</>
                      ) : (
                        "Jetzt annehmen"
                      )}
                    </Button>
                  )}
                </div>
              </GlassCard>
            );
          })
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, FileCheck, Calendar, Globe, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// Reuse the contract sections component
function ContractSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="font-bold text-primary text-sm">{title}</h3>
      <div className="text-muted-foreground text-[13px] leading-relaxed">{children}</div>
    </div>
  );
}

export default function SalesRepMeinVertrag() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    const { data } = await (supabase
      .from("sales_rep_profiles") as any)
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
          <Button onClick={() => navigate("/vertriebler/vertrag")}>
            Jetzt Vertrag öffnen
          </Button>
        </GlassCard>
      </div>
    );
  }

  const angenommenAm = new Date(profile.vertrag_angenommen_am);
  const fullName = `${profile.first_name} ${profile.last_name}`;
  const adresse = `${profile.street || ""} ${profile.house_number || ""}, ${profile.postal_code || ""} ${profile.city || ""}`.trim();
  const partnerId = profile.employee_number ? `PID-${profile.employee_number}` : "—";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mein Vertrag</h1>
        <p className="text-sm text-muted-foreground mt-1">Dein Vertriebspartnervertrag mit ELOYO</p>
      </div>

      {/* Outdated banner */}
      {profile.vertrag_outdated && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Deine Profildaten haben sich geändert.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Bitte nimm den aktualisierten Vertrag erneut an, um wieder aktiv zu sein.
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="mt-2"
              onClick={() => navigate("/vertriebler/vertrag")}
            >
              Zum Vertrag →
            </Button>
          </div>
        </div>
      )}

      {/* Contract status card */}
      <GlassCard className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg">Vertriebspartnervertrag</h2>
            <p className="text-sm text-muted-foreground">Freier Kooperationsvertrag</p>
          </div>
          <Badge className={profile.vertrag_outdated
            ? "bg-orange-100 text-orange-800 hover:bg-orange-100"
            : "bg-green-100 text-green-800 hover:bg-green-100"
          }>
            <FileCheck className="w-3 h-3 mr-1" />
            {profile.vertrag_outdated ? "Aktualisierung nötig" : "Angenommen"}
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

      {/* Full contract content (scrollable) */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="max-h-[60vh] overflow-y-auto p-6 space-y-6 text-sm leading-relaxed">
          <div className="text-center space-y-2 pb-4 border-b">
            <h2 className="text-xl font-bold text-primary">VERTRIEBSPARTNERVERTRAG</h2>
            <p className="text-muted-foreground">Freier Kooperationsvertrag zwischen ELOYO und dem Vertriebspartner</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-base">Vertragsparteien</h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-1">
              <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Auftraggeber</p>
              <p><strong>ELOYO</strong>, Inhaber Klaus Eric Pfadisch</p>
              <p>Fuggerstr. 2, 86836 Untermeitingen, Bayern</p>
              <p>USt-IdNr.: DE337756435</p>
              <p>E-Mail: support@eloyo.de</p>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-1">
              <p className="font-semibold text-xs text-primary uppercase tracking-wider">Auftragnehmer (Vertriebspartner)</p>
              <p><strong>{fullName}</strong></p>
              <p>{adresse}</p>
              <p>E-Mail: {profile.email || "—"}</p>
              <p>Steuernummer: {profile.tax_number || "—"}</p>
              {profile.vat_id && <p>USt-IdNr.: {profile.vat_id}</p>}
              <p>Partner-ID: {partnerId}</p>
              <p>Angenommen am: {angenommenAm.toLocaleDateString("de-DE")}</p>
            </div>
          </div>

          <ContractSection title="A – Vertragsart & Grundlage">
            Dieser Vertrag begründet ein freies Kooperationsverhältnis im Sinne eines handelsvertreterähnlichen Verhältnisses zwischen ELOYO und dem Vertriebspartner. Es handelt sich ausdrücklich um keinen Arbeitsvertrag und kein Anstellungsverhältnis. Für diesen Vertrag gilt deutsches Recht. Ausschließlicher Gerichtsstand ist Augsburg.
          </ContractSection>

          <ContractSection title="B – Selbstständigkeit & Wettbewerb">
            <p>Der Vertriebspartner ist gewerblich selbständig tätig. Es besteht kein Arbeitsverhältnis im Sinne des deutschen Arbeitsrechts.</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Der Vertriebspartner ist in der Gestaltung seiner Tätigkeit frei.</li>
              <li>Er trägt das eigene unternehmerische Risiko.</li>
              <li>Eine gleichzeitige Tätigkeit für andere Auftraggeber ist zulässig, sofern kein Wettbewerbsverstoß vorliegt.</li>
            </ul>
            <p className="mt-3 font-semibold">Wettbewerbsregelung</p>
            <p>Während der Laufzeit ist es dem Vertriebspartner untersagt, für direkte Wettbewerber tätig zu sein. Ein Verstoß berechtigt ELOYO zur fristlosen Kündigung.</p>
          </ContractSection>

          <ContractSection title="C – Auftreten nach außen">
            Der Vertriebspartner ist nicht berechtigt, im Namen von ELOYO rechtsverbindliche Erklärungen abzugeben. Gegenüber Dritten hat er sich als „Vertriebspartner von ELOYO" vorzustellen.
          </ContractSection>

          <ContractSection title="D – Registrierung & Account-Aktivierung">
            <ol className="list-decimal pl-5 space-y-1">
              <li>ELOYO legt den Account an.</li>
              <li>E-Mail mit Link zur Passwortvergabe.</li>
              <li>Bankdaten und Steuernummer hinterlegen.</li>
              <li>Vertrag innerhalb von 14 Tagen digital annehmen.</li>
            </ol>
          </ContractSection>

          <ContractSection title="E – Provisionsmodell">
            <p><strong>Direktprovision:</strong> 50,00 € netto pro Neukunde.</p>
            <p><strong>Folgeprovision:</strong> 12,00 € netto/Monat pro aktivem Kunden.</p>
            <p><strong>Inaktivitätsregel:</strong> Ab Tag 91 ohne Abschluss keine Folgeprovisionen.</p>
            <p><strong>Sponsor-Bonus:</strong> 5,00 € netto/Monat pro aktivem Kunden des gesponserten Partners.</p>
            <p><strong>Abrechnung:</strong> Im Gutschriftverfahren.</p>
          </ContractSection>

          <ContractSection title="F – Auszahlung">
            Monatlich zum 1., Eingang bis spätestens 5. des Monats. Maßgeblich sind die im Backoffice hinterlegten Bankdaten.
          </ContractSection>

          <ContractSection title="G – Inaktivität & Konsequenzen">
            <p>Tag 1–90: AKTIV. Ab Tag 91: INAKTIV. Ab Monat 13: ACCOUNT GELÖSCHT.</p>
          </ContractSection>

          <ContractSection title="H – Kündigung">
            30 Tage zum Monatsende. Fristlose Kündigung bei Wettbewerbsverstoß oder Rufschädigung.
          </ContractSection>

          <ContractSection title="I – eloyo Boxen & Bestellsystem">
            Starterpaket: 4 Boxen / 120 €. Vertriebspaket: 7 Boxen / 210 €. Warenwert je Box: 30 € brutto.
          </ContractSection>

          <ContractSection title="J–N – Weitere Bestimmungen">
            Empfehlung neuer Vertriebspartner (1 Ebene), Schulungsangebot (freiwillig), Datenschutz (DSGVO), Haftung (Eigenverantwortung), Salvatorische Klausel, deutsches Recht, Gerichtsstand Augsburg.
          </ContractSection>

          {/* Signature block */}
          <div className="border-t border-primary/30 pt-4 mt-6 space-y-3">
            <h3 className="font-bold text-primary text-center">DIGITALE ANNAHME</h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-xs">
              <p><strong>Name:</strong> {fullName}</p>
              <p><strong>Datum:</strong> {angenommenAm.toLocaleDateString("de-DE")}, {angenommenAm.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr</p>
              <p><strong>IP-Adresse:</strong> {profile.vertrag_ip || "—"}</p>
              <p><strong>User-ID:</strong> {profile.user_id}</p>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Durch Eingabe des vollständigen Namens und digitale Bestätigung im Eloyo-Backoffice wurde dieser Vertrag verbindlich gemäß § 305 BGB angenommen.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

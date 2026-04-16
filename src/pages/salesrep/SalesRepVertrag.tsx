import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Loader2, FileSignature, CheckCircle2, AlertCircle } from "lucide-react";

export default function SalesRepVertrag() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [confirmName, setConfirmName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    const { data, error } = await (supabase
      .from("sales_rep_profiles") as any)
      .select("*")
      .eq("user_id", user!.id)
      .single();
    if (error) {
      toast.error("Profil konnte nicht geladen werden");
      return;
    }
    setProfile(data);
    setLoading(false);

    if (data?.vertrag_angenommen_am) {
      navigate("/vertriebler/mein-vertrag");
    }
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      setScrolledToBottom(true);
    }
  };

  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : "";
  const nameMatches = confirmName.trim().toLowerCase() === fullName.trim().toLowerCase();
  const canSign = nameMatches && accepted && scrolledToBottom;

  // Check if required fields are filled
  const missingFields = profile ? [
    !profile.street && "Straße",
    !profile.postal_code && "PLZ",
    !profile.city && "Ort",
    !profile.iban && "IBAN",
    !profile.bic && "BIC",
  ].filter(Boolean) : [];

  const handleSign = async () => {
    if (!canSign || signing) return;
    setSigning(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Nicht angemeldet");

      const { data, error } = await supabase.functions.invoke("sign-contract", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Vertrag erfolgreich angenommen. Du kannst ihn jederzeit unter "Mein Vertrag" einsehen.');
      navigate("/vertriebler");
    } catch (err: any) {
      toast.error(err.message || "Fehler bei der Vertragsannahme");
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const adresse = `${profile?.street || ""} ${profile?.house_number || ""}, ${profile?.postal_code || ""} ${profile?.city || ""}`.trim();
  const partnerId = profile?.employee_number ? `PID-${profile.employee_number}` : "—";

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-32">
      <div>
        <h1 className="text-2xl font-bold">Dein Vertriebspartnervertrag</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lies den Vertrag vollständig durch. Nach Annahme kannst du ihn jederzeit herunterladen.
        </p>
      </div>

      {missingFields.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Profil unvollständig</p>
            <p className="text-sm text-muted-foreground mt-1">
              Bitte ergänze zuerst folgende Felder in deinen Einstellungen: {missingFields.join(", ")}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => navigate("/vertriebler/settings")}
            >
              Zu den Einstellungen
            </Button>
          </div>
        </div>
      )}

      {/* Contract content */}
      <GlassCard className="p-0 overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="max-h-[60vh] overflow-y-auto p-6 space-y-6 text-sm leading-relaxed"
        >
          {/* Title */}
          <div className="text-center space-y-2 pb-4 border-b">
            <h2 className="text-xl font-bold text-primary">VERTRIEBSPARTNERVERTRAG</h2>
            <p className="text-muted-foreground">Freier Kooperationsvertrag zwischen ELOYO und dem Vertriebspartner</p>
          </div>

          {/* Vertragsparteien */}
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
              <p>E-Mail: {profile?.email || "—"}</p>
              <p>Telefon: {profile?.phone || "—"}</p>
              <p>Steuernummer: {profile?.tax_number || "—"}</p>
              {profile?.vat_id && <p>USt-IdNr.: {profile.vat_id}</p>}
              <p>IBAN / BIC: {profile?.iban || "—"} / {profile?.bic || "—"}</p>
              <p>Partner-ID: {partnerId}</p>
              <p>Vertragsdatum: {new Date().toLocaleDateString("de-DE")}</p>
            </div>
          </div>

          {/* Sections */}
          <ContractSection title="A – Vertragsart & Grundlage">
            Dieser Vertrag begründet ein freies Kooperationsverhältnis im Sinne eines handelsvertreterähnlichen Verhältnisses zwischen ELOYO und dem Vertriebspartner. Es handelt sich ausdrücklich um keinen Arbeitsvertrag und kein Anstellungsverhältnis. Für diesen Vertrag gilt deutsches Recht. Ausschließlicher Gerichtsstand ist Augsburg.
          </ContractSection>

          <ContractSection title="B – Selbstständigkeit & Wettbewerb">
            <p>Der Vertriebspartner ist gewerblich selbständig tätig. Es besteht kein Arbeitsverhältnis im Sinne des deutschen Arbeitsrechts. Im Einzelnen gilt:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Der Vertriebspartner ist in der Gestaltung seiner Tätigkeit frei – es besteht keine Weisungsgebundenheit hinsichtlich Ort, Zeit, Art und Umfang der Tätigkeit.</li>
              <li>Er trägt das eigene unternehmerische Risiko und ist für die Anmeldung und Versteuerung seiner Einnahmen selbst verantwortlich.</li>
              <li>Eine gleichzeitige Tätigkeit für andere Auftraggeber ist grundsätzlich zulässig, sofern kein Verstoß gegen die Wettbewerbsregelung vorliegt.</li>
              <li>Alle im Backoffice bereitgestellten Tools sind freiwillige Angebote ohne Nutzungspflicht.</li>
              <li>Es besteht keine Pflicht zum Tragen von Uniformen oder zum Führen eines Mitarbeiterausweises.</li>
            </ul>
            <p className="mt-3 font-semibold">Wettbewerbsregelung</p>
            <p>Während der Laufzeit dieses Vertrags ist es dem Vertriebspartner untersagt, aktiv für Unternehmen tätig zu sein, die digitale Kundenbindungsprogramme, Loyalty-Systeme oder digitales Direktmarketing für lokale Einzelhändler und Gewerbebetriebe anbieten und damit in direktem Wettbewerb zu ELOYO stehen. Ein Verstoß berechtigt ELOYO zur außerordentlichen fristlosen Kündigung.</p>
          </ContractSection>

          <ContractSection title="C – Auftreten nach außen">
            Der Vertriebspartner ist nicht berechtigt, im Namen von ELOYO rechtsverbindliche Erklärungen abzugeben oder Verträge zu schließen. Gegenüber Kunden und Dritten hat er sich ausschließlich als „Vertriebspartner von ELOYO" vorzustellen.
          </ContractSection>

          <ContractSection title="D – Registrierung & Account-Aktivierung">
            <ol className="list-decimal pl-5 space-y-1">
              <li>ELOYO legt den Account im Backoffice an.</li>
              <li>Der Vertriebspartner erhält eine E-Mail mit Link zur Passwortvergabe.</li>
              <li>Pflicht: Bankdaten und Steuernummer im Backoffice hinterlegen.</li>
              <li>Erst nach vollständiger Dateneingabe ist die Vertragsvorlage verfügbar.</li>
              <li>Der Vertrag muss innerhalb von 14 Tagen nach Account-Anlage digital angenommen werden. Bei Fristversäumnis wird der Account automatisch gelöscht.</li>
            </ol>
          </ContractSection>

          <ContractSection title="E – Provisionsmodell">
            <p className="font-semibold">1. Direktprovision</p>
            <p>Für jeden erfolgreich geworbenen Kunden erhält der Vertriebspartner eine einmalige Direktprovision in Höhe von 50,00 € netto. Die Auszahlung erfolgt 7 Tage nach bestätigtem Zahlungseingang des Neukunden.</p>

            <p className="font-semibold mt-3">2. Folgeprovision</p>
            <p>Solange ein geworbener Kunde aktiv bleibt und seinen Vertrag bei ELOYO aufrechterhält, erhält der Vertriebspartner eine monatliche Folgeprovision in Höhe von 12,00 € netto pro aktivem Kunden.</p>

            <p className="font-semibold mt-3">3. Inaktivitätsregel</p>
            <p>Ab dem 91. Tag ohne bestätigten Neukunden-Abschluss gilt der Vertriebspartner als inaktiv. Während der Inaktivität werden keine Folgeprovisionen ausgezahlt. Nicht ausgezahlte Folgeprovisionen verfallen ersatzlos.</p>

            <p className="font-semibold mt-3">4. Sponsor-Bonus</p>
            <p>Empfiehlt der Vertriebspartner eine Person als neuen Vertriebspartner, erhält er einen monatlichen Bonus von 5,00 € netto pro aktivem Kunden des gesponserten Partners. Dies gilt nur für eine Ebene.</p>

            <p className="font-semibold mt-3">5. Umsatzsteuer & Abrechnung</p>
            <p>Die Abrechnung erfolgt im Gutschriftverfahren. ELOYO erstellt die Abrechnungsdokumente und stellt diese im Backoffice zum Download bereit.</p>
          </ContractSection>

          <ContractSection title="F – Auszahlung">
            Die Auszahlung erfolgt monatlich. ELOYO initiiert die Überweisung zum 1. eines jeden Monats; der Zahlungseingang beim Vertriebspartner erfolgt spätestens bis zum 5. des Monats. Bei Wochenenden oder Feiertagen kann sich die Auszahlung entsprechend verschieben. Maßgeblich für die Überweisung sind ausschließlich die im Backoffice hinterlegten Bankdaten.
          </ContractSection>

          <ContractSection title="G – Inaktivität & Konsequenzen">
            <p>Als Aktivität gilt ausschließlich der bestätigte Zahlungseingang eines Neukunden. Ab dem Tag des letzten Zahlungseingangs läuft ein Zähler in Kalendertagen.</p>
            <div className="bg-muted/50 rounded p-3 mt-2 space-y-1 text-xs">
              <p><strong>Tag 1–90:</strong> AKTIV – Folgeprovision wird normal berechnet und ausgezahlt.</p>
              <p><strong>Ab Tag 91:</strong> INAKTIV – Keine Folgeprovisionen. Account eingefroren.</p>
              <p><strong>Ab Monat 13:</strong> ACCOUNT GELÖSCHT – Vollständige Löschung, Kundenzuordnung aufgehoben.</p>
            </div>
          </ContractSection>

          <ContractSection title="H – Kündigung">
            Der Vertrag kann von beiden Seiten mit einer Frist von 30 Tagen zum Monatsende schriftlich gekündigt werden. ELOYO ist zur außerordentlichen fristlosen Kündigung berechtigt bei Verstoß gegen die Wettbewerbsregelung, Rufschädigung, oder Verstößen gegen geltendes Recht.
          </ContractSection>

          <ContractSection title="I – eloyo Boxen & Bestellsystem">
            <p>Der Vertriebspartner kann über das Backoffice zwei Pakete bestellen:</p>
            <div className="bg-muted/50 rounded p-3 mt-2 space-y-1 text-xs">
              <p><strong>Starterpaket:</strong> 4 eloyo Boxen / 120,00 € – Keine Voraussetzung</p>
              <p><strong>Vertriebspaket:</strong> 7 eloyo Boxen / 210,00 € – Mind. 4 aktive Kunden</p>
            </div>
            <p className="mt-2">Jede eloyo Box hat einen Warenwert von 30,00 € brutto. Es kann immer nur ein Paket gleichzeitig bestellt werden. Nicht abgeschlossene Boxen werden nach 91 Tagen in Rechnung gestellt.</p>
          </ContractSection>

          <ContractSection title="J – Empfehlung neuer Vertriebspartner">
            Der Vertriebspartner kann Personen als potenzielle neue Vertriebspartner bei ELOYO vorschlagen. Die Entscheidung über die Aufnahme liegt ausschließlich bei ELOYO. Es gilt ausschließlich eine Sponsor-Ebene – kein Strukturvertrieb.
          </ContractSection>

          <ContractSection title="K – Schulungsangebot">
            ELOYO stellt im Backoffice Schulungsvideos und Materialien kostenfrei zur Verfügung. Die Nutzung ist freiwillig. Ein Ausbildungsverhältnis wird hierdurch nicht begründet.
          </ContractSection>

          <ContractSection title="L – Datenschutz & Auftragsverarbeitung">
            Der Vertriebspartner verpflichtet sich, alle personenbezogenen Daten, die ihm im Rahmen der Vertriebstätigkeit bekannt werden, vertraulich zu behandeln und die Vorschriften der DSGVO einzuhalten.
          </ContractSection>

          <ContractSection title="M – Haftung">
            Der Vertriebspartner handelt in eigener Verantwortung. ELOYO haftet nicht für Schäden, die durch das Handeln des Vertriebspartners gegenüber Dritten entstehen.
          </ContractSection>

          <ContractSection title="N – Sonstige Klauseln">
            <p><strong>Salvatorische Klausel:</strong> Sollte eine Bestimmung dieses Vertrags ganz oder teilweise unwirksam sein, berührt dies die Gültigkeit der übrigen Bestimmungen nicht.</p>
            <p className="mt-2"><strong>Schriftformklausel:</strong> Änderungen dieses Vertrags bedürfen der Schriftform oder des bestätigten Uploads im Backoffice-System.</p>
            <p className="mt-2"><strong>Anwendbares Recht:</strong> Es gilt ausschließlich deutsches Recht.</p>
            <p className="mt-2"><strong>Gerichtsstand:</strong> Ausschließlicher Gerichtsstand für alle Streitigkeiten ist Augsburg.</p>
          </ContractSection>

          {/* Scroll indicator */}
          {!scrolledToBottom && (
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground animate-pulse">↓ Bitte scrolle bis zum Ende des Vertrags</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t p-4 z-50">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Vollständiger Name zur Bestätigung"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                className={`h-10 ${nameMatches && confirmName ? "border-green-500 ring-1 ring-green-500" : ""}`}
                disabled={!scrolledToBottom || missingFields.length > 0}
              />
              {confirmName && !nameMatches && (
                <p className="text-xs text-destructive mt-1">Name muss exakt „{fullName}" lauten</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              id="accept"
              checked={accepted}
              onCheckedChange={(v) => setAccepted(v === true)}
              disabled={!scrolledToBottom || missingFields.length > 0}
            />
            <label htmlFor="accept" className="text-xs text-muted-foreground cursor-pointer leading-snug">
              Ich habe den Vertrag vollständig gelesen und akzeptiere ihn verbindlich gemäß § 305 BGB.
            </label>
          </div>
          <Button
            onClick={handleSign}
            disabled={!canSign || signing || missingFields.length > 0}
            className="w-full h-11"
          >
            {signing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Wird verarbeitet...</>
            ) : (
              <><FileSignature className="w-4 h-4 mr-2" />Jetzt verbindlich unterzeichnen</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ContractSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="font-bold text-primary text-sm">{title}</h3>
      <div className="text-muted-foreground text-[13px] leading-relaxed">{children}</div>
    </div>
  );
}

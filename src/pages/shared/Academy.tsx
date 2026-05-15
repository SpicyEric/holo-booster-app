import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "was-ist", label: "Was ist eloyo?" },
  { id: "system", label: "Das eloyo-System verstehen" },
  { id: "box", label: "Die eloyo Box" },
  { id: "mindset", label: "Mindset & Vertrieb" },
  { id: "kunden", label: "Kunden gewinnen & abschließen" },
  { id: "abschluss", label: "Technischer Abschluss & Einrichtung" },
] as const;

type TabId = typeof TABS[number]["id"];

const ACCENT = "#8B5CF6";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function Card({ children, accent = false, className }: { children: React.ReactNode; accent?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white/70 backdrop-blur-sm shadow-sm p-5",
        accent && "border-l-4",
        className
      )}
      style={accent ? { borderLeftColor: ACCENT } : undefined}
    >
      {children}
    </div>
  );
}

function Quote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="rounded-xl bg-violet-50/70 border border-violet-100 p-4 text-[14px] italic text-foreground/80 whitespace-pre-line">
      {children}
    </blockquote>
  );
}

export default function Academy() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as TabId | null;
  const active: TabId = TABS.some((t) => t.id === tabParam) ? (tabParam as TabId) : "was-ist";
  const setActive = (id: TabId) => setSearchParams({ tab: id }, { replace: true });
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [active]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}15`, color: ACCENT }}>
            <GraduationCap className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">eloyo Academy</h1>
        </div>
        <p className="text-muted-foreground">Dein Schnell-Onboarding für den Vertrieb</p>
      </header>

      {/* Tabs */}
      <div className="border-b overflow-x-auto -mx-2 px-2">
        <div className="flex gap-1 min-w-max">
          {TABS.map((t) => {
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={cn(
                  "relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                style={isActive ? { color: ACCENT } : undefined}
              >
                {t.label}
                {isActive && (
                  <span
                    className="absolute left-2 right-2 -bottom-px h-[3px] rounded-full"
                    style={{ background: ACCENT }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={contentRef} key={active} className="animate-fade-in space-y-6">
        {active === "was-ist" && <TabWasIst />}
        {active === "system" && <TabSystem />}
        {active === "box" && <TabBox />}
        {active === "mindset" && <TabMindset />}
        {active === "kunden" && <TabKunden />}
        {active === "abschluss" && <TabAbschluss />}
      </div>
    </div>
  );
}

function TabWasIst() {
  return (
    <>
      <Card>
        <Section title="Was ist eloyo?">
          <p>
            eloyo ist ein digitales Treueprogramm für lokale Geschäfte. Kein Terminal, kein Tablet, keine Schulung fürs Personal.
            Einmal einrichten — danach arbeitet das System vollautomatisch.
          </p>
          <p>Im Kern macht eloyo drei Dinge:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Bestehende Kunden ans Geschäft binden</li>
            <li>Neukunden gewinnen über Empfehlungen</li>
            <li>Automatisch mehr Google-Bewertungen generieren</li>
          </ul>
          <p>
            Das Geschäft muss dafür nichts aktiv tun. Kein Mitarbeiter muss Kunden ansprechen, fragen ob sie eine Kundenkarte wollen
            oder erklären wie es funktioniert. Der Aufsteller übernimmt das — wenn er gut designt und platziert ist, vollständig automatisch.
          </p>
        </Section>
      </Card>

      <Card>
        <Section title="Für wen ist eloyo?">
          <p>
            Für lokale Einzelgeschäfte: Barbershops, Friseure, Bäckereien, Cafés, Imbisse, Nagelstudios, Blumenläden und viele mehr.
            Ob 20 Kunden am Tag oder 200 — eloyo funktioniert für jeden, der Stammkunden aufbauen möchte.
          </p>
          <p>
            <strong className="text-foreground">Aktuell noch nicht geeignet:</strong> Ketten und Franchises mit mehreren Standorten.
            Entsprechende Modelle sind in Entwicklung.
          </p>
        </Section>
      </Card>

      <Card accent>
        <h3 className="text-lg font-semibold mb-2">📈 Das Potenzial</h3>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Allein in Deutschland gibt es über 3,5 Millionen kleine lokale Gewerbebetriebe — ohne Ketten, ohne Franchises. Friseure,
          Bäcker, Cafés, Imbisse, Nagelstudios. Das ist der Markt, in dem du arbeitest. Wenn du an einem schlechten Tag frustriert
          bist: Du hast gerade an der Oberfläche gekratzt.
        </p>
      </Card>
    </>
  );
}

function TabSystem() {
  return (
    <>
      <Card>
        <Section title="Die wichtigsten Begriffe">
          <div>
            <p className="font-semibold text-foreground">Check-in</p>
            <p>
              Das ist der Kernvorgang. Ein Kunde hält sein Handy an die NFC-Karte des Geschäfts und bekommt Fortschritt in seinem
              Treuepass gutgeschrieben. Ein Check-in = ein Besuch mit Kauf.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Treuepass</p>
            <p>
              Die digitale Kundenkarte des Kunden in der eloyo-App. Dort sieht er seine gesammelten Check-ins, welche Prämien er
              schon hat und was als nächstes kommt. Je attraktiver der Pass aufgebaut ist, desto stärker zieht er zurück.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Boost</p>
            <p>
              Das Empfehlungssystem. Wenn ein Kunde Freunde einlädt, die dann auch einchecken, bekommt der Einladende Boosts: beim
              ersten eingeladenen Freund 1 Bonus-Check-in, beim zweiten 2, beim dritten 3 — dann resettet es wieder auf 1, 2, 3.
              Das hält den Anreiz dauerhaft hoch, immer wieder neue Menschen ins Geschäft zu schicken.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Prämie</p>
            <p>
              Was der Kunde bekommt, wenn er eine bestimmte Anzahl Check-ins erreicht. Kein fester Betrag, kein vorgegebenes
              System — das legt jedes Geschäft selbst fest. Beispiele: kostenloses Softgetränk, Upgrade einer Bestellung, 10 %
              Rabatt, gratis Croissant zum Kaffee, kostenlose Bartpflege beim Friseur.
            </p>
          </div>
        </Section>
      </Card>

      <Card>
        <Section title="So läuft ein Check-in in der Praxis">
          <ol className="list-decimal pl-6 space-y-1">
            <li>Kunde kommt rein, kauft etwas</li>
            <li>Kunde spricht den Kassierer auf seinen Check-in an</li>
            <li>Kassierer hält die NFC-Karte ans Handy des Kunden</li>
            <li>Check-in erscheint sofort in der App — fertig</li>
          </ol>
          <p>Kein Tippen, kein Knopf, kein System einloggen. Einfacher als Kartenzahlung.</p>
          <p>
            <strong className="text-foreground">Wichtig:</strong> Check-ins werden nur vergeben, wenn der Kunde auch etwas bestellt
            und bezahlt hat. Das Geschäft entscheidet selbst, ob es eine Mindestbestellmenge gibt — das ist seine freie Entscheidung
            und nicht die des Vertrieblers.
          </p>
        </Section>
      </Card>

      <Card accent>
        <h3 className="text-lg font-semibold mb-2">📲 Die eloyo-App — lad sie dir jetzt runter</h3>
        <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">
          <p>
            Als Vertriebler musst du die App kennen wie deine eigene Hosentasche. Lad sie dir jetzt runter, richte einen Testaccount
            ein und klick dich durch. Schau dir an:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Wie sieht ein Treuepass aus?</li>
            <li>Wie funktioniert der Check-in-Vorgang?</li>
            <li>Wie sehen Prämien aus?</li>
            <li>Wie funktioniert die Boost-Einladung?</li>
          </ul>
          <p className="font-medium text-foreground">
            Wer die App nicht kennt, kann sie nicht verkaufen. Wer sie kennt, braucht keine großen Worte.
          </p>
        </div>
      </Card>
    </>
  );
}

function TabBox() {
  const items = [
    {
      icon: "📦",
      title: "Das eloyo-Terminal",
      text: "Ein kompakter, stylischer Kunststoffhalter mit eloyo-Branding. Darin steckt die NFC-Karte. Steht an der Kasse, braucht keinen Strom, sieht gut aus. Als Vertriebler bekommst du einen Demo-Terminal — nutze ihn bei jedem Termin. Eine Live-Demo ist 10× wirkungsvoller als jede Erklärung.",
    },
    {
      icon: "🃏",
      title: "1 NFC-Karte",
      text: "Das Herzstück. Kassierer hält sie ans Handy des Kunden — Check-in ist gutgeschrieben. Die Karte ist mit dem Geschäft verknüpft und funktioniert dauerhaft.",
    },
    {
      icon: "🪧",
      title: "2 × L-Aufsteller (DIN A5)",
      text: "Tisch-Aufsteller für die Kasse. Kunden, die noch keine App haben, laden sie über den QR-Code darauf herunter. Einmal hingestellt, macht er danach seinen Job. Im Abo ist einmal pro Monat ein individuell angepasstes Design kostenlos dabei — Geschäftsname, Logo, keine eloyo-Branding-Pflicht. Das kann der Händler unter „Profil\" direkt anfordern. Auch saisonal: Halloween-Krapfen beim Bäcker, Winterangebot beim Café — ein passender Aufsteller bringt deutlich mehr Conversions als ein Blankodesign.",
    },
    {
      icon: "🔑",
      title: "Karten-ID",
      text: "Auf der Innenseite des Box-Deckels. Wird bei der Einrichtung eingetragen, damit NFC-Karte und Geschäft miteinander verknüpft werden. Nicht wegwerfen.",
    },
  ];
  return (
    <>
      <Card>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Was bekommt ein Geschäft, wenn es startet?
        </p>
      </Card>

      <div className="grid gap-3">
        {items.map((it) => (
          <Card key={it.title}>
            <div className="flex items-start gap-4">
              <div className="text-2xl shrink-0">{it.icon}</div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">{it.title}</h4>
                <p className="text-[15px] leading-relaxed text-muted-foreground">{it.text}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card accent>
        <h3 className="text-lg font-semibold mb-2">📋 Boxen bestellen</h3>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Im Backoffice unter „Bestellung" findest du zwei Pakete mit allen Infos zu Versand, Lieferzeit und Kosten.
        </p>
      </Card>
    </>
  );
}

function TabMindset() {
  return (
    <>
      <Card accent>
        <p className="text-[15px] leading-relaxed text-foreground font-medium">
          Das ist der wichtigste Teil dieses Onboardings. Lies ihn zweimal.
        </p>
      </Card>

      <Card>
        <Section title="Du wirst auf die Fresse bekommen.">
          <p>
            Nicht vielleicht. Sicher. Es wird Tage geben, an denen du 15 Anrufe machst und 15 Absagen bekommst. Es wird Gespräche
            geben, die super liefen — und trotzdem nichts draus wird. Das ist kein Zeichen, dass eloyo nicht funktioniert. Das ist
            Vertrieb.
          </p>
          <p>
            Wer das nicht aushält, wird nicht erfolgreich. Wer damit umgehen kann — und trotzdem am nächsten Morgen wieder anfängt —
            baut sich etwas auf.
          </p>
        </Section>
      </Card>

      <Card>
        <Section title="Was du hier aufbaust">
          <p>
            Das ist kein Nebenjob, bei dem du schnell ein paar Euro verdienst. Das ist die Möglichkeit, dir über die nächsten Jahre
            ein passives Einkommen aufzubauen, das ohne deinen täglichen Einsatz weiterläuft.
          </p>
          <p>
            Am Anfang wirst du unterbezahlt sein. Das ist normal. Jeder, der heute 2.000 € im Monat passiv verdient, hat irgendwann
            mit null angefangen.
          </p>
          <p>
            Der Unterschied zwischen denen, die es schaffen, und denen, die aufhören:{" "}
            <strong className="text-foreground">Erstere denken in Jahren, nicht in Wochen.</strong>
          </p>
        </Section>
      </Card>

      <Card>
        <Section title="eloyo ist ein Start-up — und das ist eine Chance">
          <p>
            Das Produkt ist real, es funktioniert, und es hat Nachfrage. Aber es ist noch keine Marke. Das bedeutet: Du verkaufst
            heute etwas, das morgen bekannter, besser und wertvoller wird. Die Preise werden steigen, wenn mehr Erfolgsgeschichten
            da sind. Die Provisionen werden sich positiv entwickeln. Neue Produkte werden dazukommen.
          </p>
          <p>Wer jetzt dabei ist, baut mit auf — und profitiert davon, wenn es größer wird.</p>
        </Section>
      </Card>

      <Card>
        <Section title="Was eloyo von dir braucht">
          <p>
            Kein stilles Vor-sich-Hinarbeiten. Fragen, Feedback, Ideen — meld dich beim eloyo-Team. Du bist nicht allein. Das Team
            hat ein starkes Interesse daran, dass du erfolgreich bist, weil dein Erfolg der Erfolg von eloyo ist.
          </p>
        </Section>
      </Card>

      <Card accent>
        <h3 className="text-lg font-semibold mb-2">🚫 Was du NICHT tun solltest</h3>
        <ul className="list-disc pl-6 space-y-1 text-[15px] leading-relaxed text-muted-foreground">
          <li>Aufhören, wenn eine Woche schlecht läuft</li>
          <li>Annehmen, dass 50 Absagen bedeuten, dass es nicht klappt</li>
          <li>eloyo zu kompliziert erklären — lieber weniger sagen, aber das Richtige</li>
          <li>Kunden abschließen und vergessen — deine Kundenbasis ist dein passives Einkommen</li>
        </ul>
      </Card>
    </>
  );
}

function TabKunden() {
  return (
    <>
      <Card>
        <Section title="Was du verkaufst — nicht das Produkt, sondern das Ergebnis">
          <p>Sag nicht: „digitales Kundenbindungssystem". Sag:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>„Neue Kunden haben sofort einen Grund, bei dir wiederzukommen"</li>
            <li>„Du hast eine direkte Verbindung zu deinen Stammkunden — direkt aufs Handy"</li>
            <li>„Du bekommst automatisch mehr Google-Bewertungen, ohne deine Kunden darum bitten zu müssen"</li>
            <li>„Deine Kunden bringen dir neue Kunden — ohne dass du was tun musst"</li>
          </ul>
          <p className="font-medium text-foreground">Sprich immer vom Ergebnis. Nie von Technologie.</p>
        </Section>
      </Card>

      <Card>
        <Section title="Weniger ist mehr beim Erklären">
          <p>
            Fang mit zwei Dingen an: <strong className="text-foreground">digitaler Treuepass + Kunden empfehlen Kunden.</strong>{" "}
            Fertig. Wenn Interesse da ist, kannst du Google-Bewertungen als zweites Argument nachlegen — das trifft fast jeden.
            „Du musst nichts extra aufstellen, nichts ansprechen. Wir tragen einmal deinen Google-Link ein und das läuft
            vollautomatisch."
          </p>
          <p>Wer zu viel erklärt, verliert den Inhaber nach Minute 3.</p>
        </Section>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-3">📞 Anrufen</h3>
        <p className="text-[15px] text-muted-foreground mb-3">Nicht um eloyo zu erklären — um einen Termin zu kriegen.</p>
        <Quote>„Hallo, mein Name ist [Name] — kurze Frage: Habt ihr aktuell Stempelkarten bei euch?"</Quote>
        <div className="mt-3 space-y-3 text-[15px] text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">→ JA:</p>
            <p className="italic mt-1">
              „Cool, dann kennt ihr das Konzept. Ich arbeite mit eloyo zusammen — das macht das Ganze digital. Ich würde euch kurz
              zeigen, wie das funktioniert — 10 Minuten. Wann passt's diese Woche?"
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">→ NEIN:</p>
            <p className="italic mt-1">
              „Verstehe. Ich hab ein digitales Kundenbindungsprogramm speziell für Geschäfte wie eures. 10 Minuten. Wann passt's?"
            </p>
          </div>
        </div>
        <p className="text-[15px] text-muted-foreground mt-4">
          Kein langer Pitch. Erst die Frage, dann Kontext, dann direkt Termin. Bei Ablehnung:{" "}
          <em>„Kein Problem, ich meld mich in ein paar Wochen nochmal."</em> — und dann auch wirklich tun.
        </p>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-3">🚶 Direkt reingehen</h3>
        <p className="text-[15px] text-muted-foreground mb-3">
          Höhere Abschlussquote als Telefon. Die Leute sehen dich, können live Fragen stellen.
        </p>
        <p className="text-[15px] text-muted-foreground mb-2">
          <strong className="text-foreground">Strategie:</strong> „Bist du der Inhaber?" → Wenn ja: direkt pitchen.
        </p>
        <p className="text-[15px] text-muted-foreground">
          Über Mitarbeiter: „Nutzt ihr hier irgendwas zur Kundenbindung?" → Nein → „Könnte ich kurz mit dem Chef sprechen?"
        </p>
        <p className="text-[15px] text-muted-foreground mt-4">
          Das Wichtigste: Geh auf den Laden ein, auf die Person, auf die Branche. Wer einen Leitfaden roboterhaft runterrasselt,
          verliert. Wer zuhört und darauf eingeht — gewinnt.
        </p>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-3">💬 Häufige Einwände</h3>
        <div className="space-y-4 text-[15px] text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">„Meine Kunden kommen eh."</p>
            <p className="italic mt-1">
              → „Genau — dann ist eloyo perfekt, um die zu halten und zu belohnen. Und wenn mal ein Stammkunde woanders hingeht, hast
              du direkt eine Möglichkeit, ihn zurückzuholen."
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">„Zu kompliziert für meine Mitarbeiter."</p>
            <p className="italic mt-1">
              → „Der Mitarbeiter hält eine Karte ans Handy. Das ist buchstäblich einfacher als Kartenzahlung entgegennehmen. Keine
              Schulung, kein Tippen, kein Knopf."
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">„Zu teuer."</p>
            <p className="italic mt-1">
              → „Wenn von deinen bestehenden Kunden nur 10 pro Monat öfter kommen — hat sich das bereits gerechnet. Und du hast
              einen direkten Kanal zu deinen Kunden, den du sonst nie hättest."
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">„Ich überleg's mir."</p>
            <p className="italic mt-1">
              → Nicht offen lassen. „Wann kann ich kurz nochmal vorbeikommen? Dann richten wir das direkt ein — dauert 30 Minuten."
            </p>
          </div>
        </div>
      </Card>

      <Card accent>
        <h3 className="text-lg font-semibold mb-2">🏆 Die goldene Regel</h3>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Nie aus einem Gespräch rausgehen, ohne dass der nächste Schritt klar ist. Entweder Abschluss vor Ort oder konkreter
          Folgetermin — immer.
        </p>
        <p className="text-[15px] leading-relaxed text-foreground font-medium mt-3">
          Hartnäckigkeit schlägt Talent. Dranbleiben ist das Einzige, was am Ende wirklich entscheidet.
        </p>
      </Card>
    </>
  );
}

function TabAbschluss() {
  return (
    <>
      <Card accent>
        <p className="text-[15px] leading-relaxed text-foreground font-medium">
          Ein Abschluss ohne vollständige Einrichtung ist kein Abschluss. Ein Kunde, der nicht fertig eingerichtet ist, kündigt.
          Einer, der es ist — bleibt.
        </p>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-2">🎯 Schritt 1: Demo (10–20 Min)</h3>
        <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">
          <p>
            Zeig dem Inhaber live, wie ein Check-in funktioniert. Halte deine Demo-NFC-Karte ans Handy — er sieht sofort, wie einfach
            das ist. Bleib bei zwei, drei Kernaussagen. Wenn die Energie stimmt und er sagt „Das klingt gut" — direkt fragen:{" "}
            <em>„Hast du grad noch eine halbe Stunde? Dann richten wir das jetzt gleich ein."</em>
          </p>
          <p>
            Wenn er gestresst wirkt oder noch einen Moment braucht: bestimmt einen Folgetermin ausmachen. Nicht fragen{" "}
            <em>„Bist du dabei?"</em> — sondern sagen: <em>„Wann kann ich nächste Woche kurz vorbeikommen?"</em>
          </p>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-2">💳 Schritt 2: Zahlung abschließen</h3>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Sobald die Zahlung durch ist, wird der Kunde automatisch im System angelegt und bekommt seine Login-E-Mail.
        </p>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-2">🔑 Schritt 3: Karten-ID eintragen</h3>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Auf der Innenseite des Box-Deckels. Im System eintragen — damit NFC-Karte und Geschäft verknüpft sind.
        </p>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-2">🎫 Schritt 4: Treuepass gemeinsam aufbauen</h3>
        <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">
          <p>
            Das ist der wichtigste Moment der Einrichtung. Nicht: du legst alles fest. Sondern: du berätst, der Kunde entscheidet.
            Er muss das Gefühl haben, dass das sein System ist.
          </p>
          <p>
            Frag: <em>„Was könntest du deinen Stammkunden anbieten, das sich für sie gut anfühlt und dich nicht viel kostet?"</em>
          </p>
          <p className="font-medium text-foreground">Aufbau-Empfehlung:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong className="text-foreground">Erste Prämie:</strong> Klein, früh erreichbar (z. B. 1.–3. Check-in). Kostet den
              Laden 1–3 €. Zieht Kunden sofort ins System. Beispiele: Softgetränk, kleine Portion Pommes, Espresso, 10 % Rabatt.
            </li>
            <li>
              <strong className="text-foreground">Mittlere Prämien:</strong> Etwas attraktiver (z. B. 6.–10. Check-in). Kostenlose
              Bartpflege, Stück Kuchen, halbes Frühstück.
            </li>
            <li>
              <strong className="text-foreground">Top-Prämie:</strong> Echte Belohnung für treue Stammkunden.
            </li>
          </ul>
          <p>
            Nicht zu früh zu viel verschenken — aber auch nicht so knauserig, dass kein Interesse entsteht. Du spielst die beratende
            Rolle, nicht die entscheidende.
          </p>
          <p>
            <strong className="text-foreground">Wichtig:</strong> Die erste Prämie erscheint automatisch in Einladungsnachrichten.
            Wenn ein Kunde per WhatsApp einlädt, steht da: „Bei [Geschäftsname] bekommst du für deinen ersten Check-in [Prämie]."
            Das muss sauber und attraktiv formuliert sein.
          </p>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-2">🎨 Schritt 5: Profil einrichten</h3>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Logo hochladen, Titelbild hochladen, Farbe einstellen, Öffnungszeiten eintragen — das machst du alles live vor Ort mit dem
          Kunden zusammen. Am Ende soll er seinen eigenen Treuepass bestaunen können. Das schafft Bindung ans Produkt.
        </p>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-2">📍 Schritt 6: Terminal & Aufsteller platzieren</h3>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Terminal an die Kasse. Aufsteller daneben. Kurze Erklärung für das Personal:{" "}
          <em>
            „Kunde kommt → ihr fragt kurz nach Check-in → Karte ans Handy → fertig. Neue Kunden: QR-Code am Aufsteller zeigen und
            direkt die Erstprämie erwähnen."
          </em>
        </p>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-2">🎬 Schritt 7: Trockenlauf</h3>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Spiel den Ablauf einmal mit dem Inhaber durch. Du bist der Endkunde, er ist der Kassierer.{" "}
          <em>„Frag mich jetzt, ob ich eine Kundenkarte hab."</em> Durchspielen, bis es natürlich sitzt.
        </p>
      </Card>

      <Card accent>
        <h3 className="text-lg font-semibold mb-2">📞 Nach der Einrichtung: dranbleiben</h3>
        <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">
          <p>
            Ruf ca. eine Woche später nochmal an. Wie läuft's? Gibt es Fragen? Wenn es noch nicht richtig läuft — fahr nochmal hin.
            Nicht um zu schauen, sondern um ihn wirklich on track zu bringen.
          </p>
          <p>
            Ein Kunde, der eloyo richtig nutzt, bleibt. Einer, der's nicht richtig nutzt, kündigt — und das liegt dann auch ein
            bisschen an dir.
          </p>
          <p className="font-medium text-foreground">Deine Kundenbasis ist dein passives Einkommen. Pflege sie.</p>
        </div>
      </Card>
    </>
  );
}

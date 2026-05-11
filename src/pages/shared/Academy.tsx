import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "funktion", label: "Wie funktioniert eloyo?" },
  { id: "box", label: "Die eloyo Box" },
  { id: "kunden", label: "Wie komme ich an Kunden?" },
  { id: "abschluss", label: "Technischer Abschluss" },
  { id: "verkauf", label: "Wie verkaufe ich eloyo?" },
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

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border bg-white/80 px-3 py-1.5 text-sm text-foreground shadow-sm">
      {children}
    </span>
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
  const active: TabId = TABS.some((t) => t.id === tabParam) ? (tabParam as TabId) : "funktion";
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
        {active === "funktion" && <TabFunktion />}
        {active === "box" && <TabBox />}
        {active === "kunden" && <TabKunden />}
        {active === "abschluss" && <TabAbschluss />}
        {active === "verkauf" && <TabVerkauf />}
      </div>
    </div>
  );
}

function TabFunktion() {
  return (
    <>
      <Card>
        <Section title="Was ist eloyo?">
          <p>
            eloyo ist ein digitales Kundenbindungssystem für lokale Geschäfte. Es hilft Inhabern dabei, bestehende Kunden ans Geschäft zu binden,
            neue Kunden zu gewinnen und gleichzeitig automatisch mehr Google-Bewertungen zu bekommen.
          </p>
          <p>
            Im Kern dreht sich eloyo um drei Dinge: Kundenbindung, Neukundengewinnung und Google-Bewertungen. Kein teures Terminal, keine
            komplizierte Technik – alles läuft über NFC.
          </p>
        </Section>
      </Card>

      <Card>
        <Section title="Für wen ist eloyo?">
          <p>
            eloyo richtet sich an kleine, lokale Geschäfte – Friseure, Barbershops, Bäckereien, Cafés, Imbisse, Nagel-Studios, Blumenläden und
            viele mehr. Ob Laufkundschaft oder Stammkunden – eloyo funktioniert für jeden, der seine Kunden öfter sehen möchte.
          </p>
          <p>Es gibt nach unten keine Grenze: Selbst ein Imbiss oder ein Marktstand kann mit eloyo arbeiten.</p>
          <p>
            <strong className="text-foreground">Wichtig für dich als Vertriebler:</strong> Ketten und Franchises mit mehreren Standorten sind aktuell
            noch kein Ziel – wir konzentrieren uns auf einzelne Geschäfte. Entsprechende Modelle für Ketten sind in Entwicklung, aber noch nicht
            verfügbar.
          </p>
        </Section>
      </Card>

      <Card>
        <Section title="Wie funktioniert das technisch?">
          <p>
            Das Geschäft bekommt 3 NFC-Karten (Kreditkartengröße), die in einem kleinen, stylischen eloyo-Terminal stehen. Der Kassierer hält
            eine dieser Karten an das Handy des Kunden – und der Kunde bekommt sofort Punkte gutgeschrieben. Das war's. Kein Tablet, keine
            Kasse, kein Extra-Gerät nötig.
          </p>
          <p>
            Ab einer bestimmten Punktzahl kann sich der Kunde eine Prämie aussuchen, die das Geschäft selbst festgelegt hat. Das Geschäft kann
            außerdem direkt Push-Nachrichten und personalisierte Angebote an seine Kunden schicken.
          </p>
        </Section>
      </Card>

      <Card accent>
        <h3 className="text-lg font-semibold mb-2">🎯 Beispiel: So läuft's in der Praxis</h3>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Ein Barbershop-Kunde kommt rein. Der Barbier fragt: <em>"Hast du unsere Kundenkarte?"</em> Der Kunde sagt nein. Der Barbier antwortet:{" "}
          <em>"Kein Problem – ich nehme dich kurz auf. Du bekommst direkt 20 % Rabatt auf heute."</em>
        </p>
        <div className="mt-3 space-y-2 text-[15px] leading-relaxed text-muted-foreground">
          <p><strong className="text-foreground">Schritt 1:</strong> Kunde scannt QR-Code am Aufsteller → lädt die App runter → registriert sich in 30 Sekunden</p>
          <p><strong className="text-foreground">Schritt 2:</strong> Kassierer hält die NFC-Karte ans Handy des Kunden → Punkte werden sofort gutgeschrieben</p>
          <p><strong className="text-foreground">Schritt 3:</strong> Kunde bekommt direkt seine Neukundenprämie (z. B. 20 % Rabatt) → fühlt sich sofort belohnt → gibt eher eine gute Google-Bewertung ab</p>
        </div>
        <p className="mt-3 text-[15px] font-medium text-foreground">
          Das Geschäft hat in 30 Sekunden einen neuen Stammkunden in seinem System.
        </p>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Chip>📍 Punkte sammeln & Prämien einlösen</Chip>
        <Chip>📲 Push-Nachrichten direkt ans Handy</Chip>
        <Chip>👥 Freunde-Referral-Programm</Chip>
        <Chip>⭐ Automatische Google-Bewertungs-Anfragen</Chip>
        <Chip>🎁 Neukundenprämien</Chip>
        <Chip>💬 Personalisierte Angebote</Chip>
      </div>
    </>
  );
}

function TabBox() {
  const items = [
    { icon: "📦", title: "Das eloyo Terminal", text: "Ein kompakter Kunststoffwürfel mit eloyo-Branding. Er hält die 3 NFC-Karten ordentlich zusammen – kein Suchen, kein Verlieren. Steht einfach an der Kasse und sieht gut aus. Braucht keinen Strom." },
    { icon: "🃏", title: "3 NFC-Karten (Stempelkarten)", text: "Diese Karten sind das Herzstück. Der Kassierer hält die Karte ans Handy des Kunden – fertig. Jede Karte ist mit dem Geschäft verknüpft." },
    { icon: "🪧", title: "Aufsteller mit QR-Code", text: "Ein Tisch-Aufsteller für die Kasse. Kunden, die noch keine App haben, können sie darüber herunterladen. Wird einmal hingestellt und macht danach seinen Job." },
    { icon: "🎴", title: "Werbekärtchen (Visitenkartenformat)", text: "Kleine Karten mit QR-Code, die man Kunden mitgeben oder auslegen kann. Optional – der Aufsteller reicht in den meisten Fällen." },
    { icon: "🔑", title: "Karten-ID (auf der Innenseite des Deckels)", text: "Diese ID wird bei der Einrichtung im System eingetragen. Wichtig – nicht wegwerfen." },
  ];
  return (
    <>
      <Card>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Wenn ein Geschäft eloyo startet, bekommt es eine eloyo Starter-Box. Diese Box enthält alles, was man zum Start braucht – und nichts, was
          man nicht braucht.
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
        <h3 className="text-lg font-semibold mb-2">📋 Wie bestellt man eine eloyo Box?</h3>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Als Vertriebler kannst du im Backoffice unter „Bestellung" nachschauen. Dort findest du zwei Pakete sowie alle Infos zu Versand,
          Lieferzeit und Kosten. Du kannst Boxen für deine Kunden direkt von dort aus bestellen.
        </p>
      </Card>
    </>
  );
}

function TabKunden() {
  return (
    <>
      <Card>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Kunden zu finden ist leichter als du denkst – wenn du weißt, wie man rangeht. Es gibt zwei bewährte Wege: Anrufen und Direkt reingehen.
          Beides funktioniert. Oft ist Direktbesuch sogar schneller.
        </p>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-2">📞 Geschäfte anrufen & Termin holen</h3>
        <p className="text-[15px] text-muted-foreground mb-3">
          Ruf das Geschäft an – nicht um eloyo zu erklären, sondern um einen kurzen Termin zu bekommen. Starte mit einer Frage, nicht mit einer Vorstellung.
        </p>
        <Quote>
          „Hallo, mein Name ist [Name] – kurze Frage: Habt ihr aktuell Stempelkarten bei euch im Geschäft?"
        </Quote>
        <div className="mt-3 space-y-3 text-[15px] text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">→ Wenn JA:</p>
            <p className="italic mt-1">
              „Cool, dann kennt ihr das Konzept ja schon. Ich arbeite mit eloyo zusammen – das ist ein junges Start-up, das das Ganze digital macht.
              Wir bauen gerade in eurer Region lokale Geschäfte auf. Ich würde euch kurz zeigen, wie das funktioniert – dauert 10–15 Minuten.
              Wann passt's euch diese Woche mal?"
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">→ Wenn NEIN:</p>
            <p className="italic mt-1">
              „Verstehe. Ich arbeite mit eloyo zusammen – wir haben ein digitales Kundenbindungsprogramm speziell für Geschäfte wie eures.
              Ich würde euch kurz zeigen, wie das funktioniert – dauert 10–15 Minuten. Wann passt's euch diese Woche mal?"
            </p>
          </div>
        </div>
        <p className="text-[15px] text-muted-foreground mt-4">
          Kein langer Erklärungspart. Erst die Frage, dann kurz Kontext, dann direkt Termin. Falls direkte Ablehnung: Nicht hängenbleiben.{" "}
          <em>„Kein Problem – ich melde mich in ein paar Wochen nochmal."</em> Und dann auch wirklich tun.
        </p>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-2">🚶 Einfach reingehen</h3>
        <p className="text-[15px] text-muted-foreground mb-3">
          Geh direkt ins Geschäft, wenn du in der Nähe bist. Du musst nicht sofort mit dem Chef sprechen – manchmal ist der Weg über einen
          Mitarbeiter sogar besser.
        </p>
        <div className="space-y-4 text-[15px] text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Strategie 1 – Direkt zum Chef:</p>
            <Quote>„Entschuldigung, bist du zufällig der Inhaber?" → Wenn ja: direkt pitchen.</Quote>
          </div>
          <div>
            <p className="font-medium text-foreground">Strategie 2 – Über den Mitarbeiter:</p>
            <Quote>
              {`„Hey, kurze Frage – nutzt ihr hier aktuell irgendwas zur Kundenbindung? Stempelkarten oder so?"
→ Wenn der Mitarbeiter nein sagt: „Okay, cool. Könnte ich kurz mit dem Chef sprechen?"
→ Zum Chef: „Ich hab eben kurz mit einem eurer Mitarbeiter gesprochen – ihr nutzt aktuell noch keine Stempelkarten, richtig? Ich hätte da was Modernes, das in 10 Minuten erklärt ist. Hätte kurz Zeit?"`}
            </Quote>
          </div>
        </div>
        <p className="text-[15px] text-muted-foreground mt-4">
          Das Wichtigste: Geh auf den Laden ein, auf die Person, auf die Branche. Wer einen Leitfaden roboterhaft runterscheppert, verliert.
          Wer wirklich zuhört und auf das eingeht, was er sieht und hört – der gewinnt. Probiere viel aus, bleib sympathisch, bleib locker.
        </p>
        <p className="text-[15px] text-muted-foreground mt-3">
          Direktbesuch hat eine höhere Abschlussquote als Telefon. Die Leute sehen dich, können direkt Fragen stellen und fühlen sich nicht überrumpelt.
        </p>
      </Card>

      <Card accent>
        <h3 className="text-lg font-semibold mb-2">💡 Das Wichtigste im Vertrieb</h3>
        <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">
          <p>
            Behandle jedes Geschäft so, als wäre es dein wichtigster Abschluss. Die häufigste Fehlerquelle: Man hat 10 offene Gespräche – und vergisst
            die, die noch nicht abgesagt haben, aber einfach noch keine Zeit hatten.
          </p>
          <p>
            <strong className="text-foreground">Hartnäckigkeit schlägt Talent.</strong> Wer dranbleibt, baut sich sein Gebiet dominant auf. Wer nach
            einer Absage aufhört, lässt Geld auf dem Tisch.
          </p>
          <p>Probiere viel aus. Nicht jeder Ansatz funktioniert für jedes Geschäft. Das ist normal.</p>
          <p>
            <strong className="text-foreground">Dein Tool:</strong> Als Vertriebler bekommst du bei deinem Starterpaket einen Demo-Würfel mit
            NFC-Karten mitgeliefert. Nutze ihn bei jedem Termin – eine Live-Demo ist 10x wirkungsvoller als jede Erklärung.
          </p>
        </div>
      </Card>
    </>
  );
}

function TabAbschluss() {
  return (
    <>
      <Card>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Ein Abschluss kann beim ersten Termin passieren – oder beim zweiten. Beides ist normal, beides ist okay. Das Ziel ist immer:
          nie ohne klaren nächsten Schritt aus einem Gespräch rausgehen.
        </p>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-2">🎯 Schritt 1: Demo-Termin (10–20 Min)</h3>
        <p className="text-[15px] text-muted-foreground mb-3">
          Zeig dem Inhaber, wie eloyo funktioniert. Halte deine NFC-Karte an dein eigenes Handy – er sieht sofort, wie einfach das ist.
        </p>
        <p className="text-[15px] text-muted-foreground mb-2">Erkläre kurz:</p>
        <ul className="list-disc pl-6 space-y-1 text-[15px] text-muted-foreground">
          <li>Was eloyo macht (Punkte, Prämien, Push-Nachrichten)</li>
          <li>Wie die Box aussieht</li>
          <li>Was der Einrichtungsaufwand für ihn ist (minimal)</li>
        </ul>
        <div className="mt-4 space-y-3 text-[15px] text-muted-foreground">
          <p>
            <strong className="text-foreground">Ziel dieses Termins:</strong> Interesse wecken und – wenn die Energie stimmt – sofort abschließen.
          </p>
          <p>
            Wenn du merkst, dass der Kunde Bock hat und sagt <em>„Das klingt gut, ja"</em> – frag direkt:{" "}
            <em>„Hast du grad noch eine halbe Stunde? Dann richten wir das jetzt gleich ein."</em> Wenn er Ja sagt: direkt starten,
            kein zweiter Termin nötig.
          </p>
          <p>
            Wenn der Kunde gestresst wirkt, wenig Zeit hat oder du das Gefühl hast, er braucht noch einen Moment – mach selbstbestimmt einen
            zweiten Termin aus. Nicht fragen <em>„Hast du Bock?"</em> oder <em>„Bist du dabei?"</em> – sondern bestimmt sagen:{" "}
            <em>„Wann kann ich nächste Woche kurz vorbeikommen? Dann richten wir das in 30 Minuten ein."</em>
          </p>
          <p>
            <strong className="text-foreground">Die Regel:</strong> Nie aus einem Gespräch rausgehen, ohne dass der nächste Schritt klar ist
            – entweder Abschluss vor Ort oder konkreter Folgetermin.
          </p>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-2">✅ Schritt 2: Einrichtung (30–45 Min)</h3>
        <div className="space-y-4 text-[15px] text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground">1. Zuerst: Zahlung abschließen</p>
            <p className="mt-1">
              Sobald die Zahlung durchgelaufen ist, wird der Kunde automatisch angelegt und bekommt eine E-Mail, über die er sein Passwort
              setzen kann. Ab da ist er eingeloggt.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">2. Karten-ID eintragen</p>
            <p className="mt-1">
              Die Karten-ID befindet sich auf der Innenseite des Box-Deckels. Diese trägst du im System ein, damit die NFC-Karten mit dem
              Geschäft verknüpft sind.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">3. Punkte pro Karte einstellen</p>
            <p className="mt-1">
              Frag den Kunden: <em>„Was gibt ein Durchschnittskunde bei euch ungefähr aus?"</em> Anhand seiner Antwort stellst du die
              Punktwerte ein – zum Beispiel:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Kleine Karte (z. B. ab 5–10 €): 10 Punkte</li>
              <li>Mittlere Karte (z. B. ab 20–30 €): 30 Punkte</li>
              <li>Große Karte (z. B. ab 50–60 €): 60 Punkte</li>
            </ul>
            <p className="mt-2">Nutze runde, einfach merkbare Zahlen. Du passt das manuell an, bis es logisch klingt.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">4. Prämien gemeinsam festlegen</p>
            <p className="mt-1">
              Berate den Kunden aktiv. Frag:{" "}
              <em>„Was könntest du deinen Stammkunden schenken, das dich wenig kostet, aber sich für sie gut anfühlt?"</em> Achte darauf:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong className="text-foreground">Erste Prämie:</strong> klein und früh erreichbar (z. B. nach dem 3.–4. Besuch) – gibt einen Anreiz zum Wiederkommen</li>
              <li><strong className="text-foreground">Mittlere Prämie:</strong> etwas Attraktiveres (z. B. nach 8–10 Besuchen)</li>
              <li><strong className="text-foreground">Top-Prämie:</strong> echte Belohnung für treue Stammkunden</li>
            </ul>
            <p className="mt-2">
              Lass den Kunden nicht zu früh zu viel verschenken – aber auch nicht so geizig sein, dass kein Interesse entsteht.
              Du spielst hier die beratende Rolle.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">5. Neukundenprämie aktivieren und besprechen</p>
            <p className="mt-1">
              Erkläre dem Kunden, warum das wichtig ist:{" "}
              <em>„Wenn du einfach nur sagst 'Willst du Punkte sammeln?' – kriegst du kaum jemanden ins System.
              Aber wenn du sagst: 'Ich kann dir direkt 20 % auf heute geben, wenn du kurz mitmachst' – dann sagen fast alle Ja."</em>
            </p>
            <p className="mt-2">
              Legt gemeinsam fest, was das Neukundenangebot ist (Rabatt, Gratis-Produkt, Extra-Punkte). Es muss sofort attraktiv wirken.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">6. Weiterempfehlungs-Punkte festlegen</p>
            <p className="mt-1">
              Stell ein, wie viele Punkte ein Kunde bekommt, wenn er einen Freund mitbringt. Kurz erklären, wie das Referral-System funktioniert.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">7. Terminal, Aufsteller und Karten platzieren</p>
            <p className="mt-1">
              Terminal an die Kasse stellen. Aufsteller daneben. Kurze Erklärung für das Kassenpersonal:{" "}
              <em>„Kunde kommt → ihr fragt nach Kundenkarte → Karte ans Handy halten → Punkte vergeben.
              Neue Kunden: QR-Code am Aufsteller zeigen, direkt Neukundenprämie anbieten."</em>
            </p>
          </div>
          <div className="pt-2 border-t">
            <p>
              <strong className="text-foreground">Nach der Einrichtung:</strong> Der Kunde ist sofort live. Spiel den Ablauf einmal mit ihm
              durch – du bist der „Endkunde", er ist der Kassierer: <em>„Frag mich jetzt, ob ich eine Kundenkarte hab."</em>{" "}
              Dann durchspielen, bis er es natürlich kann.
            </p>
          </div>
        </div>
      </Card>

      <Card accent>
        <h3 className="text-lg font-semibold mb-2">📞 Nach dem Termin dran bleiben</h3>
        <p className="text-[15px] text-muted-foreground">
          Ruf den Kunden etwa eine Woche nach der Einrichtung nochmal an. Frag, wie es läuft, ob es Fragen gibt, was die ersten Ergebnisse sind.
        </p>
        <p className="text-[15px] text-muted-foreground mt-3">
          Wenn es noch nicht richtig läuft – fahr nochmal hin. Nicht um zu schauen, sondern um ihn wirklich on track zu bringen.
          Ein Kunde, der eloyo richtig nutzt, bleibt. Ein Kunde, der nicht weiß wie – kündigt.
        </p>
      </Card>
    </>
  );
}

function TabVerkauf() {
  const args = [
    { icon: "🔁", title: "Kunden kommen öfter wieder", text: "Wer Punkte hat, will sie einlösen. Das zieht Kunden zurück – automatisch." },
    { icon: "📲", title: "Direkte Linie zu deinen Kunden", text: "Kein anderes Tool gibt kleinen Geschäften so eine direkte Verbindung zu ihren Stammkunden wie Push-Nachrichten." },
    { icon: "⭐", title: "Mehr Google-Bewertungen – ohne Betteln", text: "eloyo fragt Kunden automatisch nach Bewertungen. Das passiert im richtigen Moment, wenn die Stimmung positiv ist." },
    { icon: "👥", title: "Kunden bringen Kunden", text: "Das Referral-System belohnt Kunden dafür, dass sie Freunde mitbringen. Kostenlose Mundpropaganda." },
  ];

  const objections = [
    { q: "Ich hab das nicht nötig, meine Kunden kommen eh.", a: "Super – dann wäre eloyo perfekt, um die zu halten und zu belohnen. Und wenn mal ein langjähriger Stammkunde woanders hingeht, habt ihr direkt eine Möglichkeit, ihn zurückzuholen." },
    { q: "Das ist zu kompliziert für meine Mitarbeiter.", a: "Der Mitarbeiter macht nichts Neues. Wenn ein Mitarbeiter in der Lage ist, einen Kunden abzukassieren – Kartenzahlung entgegenzunehmen, Wechselgeld rausgeben – dann kann er auch eine Karte ans Handy halten. Das ist buchstäblich einfacher als alles andere, was er täglich macht. Kein Knopf drücken, kein Tippen, keine Schulung nötig." },
    { q: "Zu teuer.", a: "Bei X Stammkunden pro Monat – wenn nur 10 davon öfter kommen – hat sich das bereits gerechnet. Und du hast jetzt einen direkten Kanal zu deinen Kunden, den du sonst nie hättest." },
    { q: "Ich überleg's mir noch.", a: "Kein Problem. Wann passt es dir, dass ich kurz nochmal vorbeischaue? (Konkreten Folgetermin ausmachen, nicht offen lassen.)" },
  ];

  return (
    <>
      <Card>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Du musst kein Verkäufer sein. Du musst nur wissen, was eloyo löst – und das klar kommunizieren. Hier sind die wichtigsten Punkte.
        </p>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-3">Was du verkaufst (nicht das Produkt, sondern das Ergebnis)</h3>
        <p className="text-[15px] text-muted-foreground mb-3">Du verkaufst nicht „ein Kundenbindungssystem". Du verkaufst:</p>
        <ul className="list-disc pl-6 space-y-1 text-[15px] text-muted-foreground">
          <li>„Dass deine Kunden öfter wiederkommen"</li>
          <li>„Dass du ihnen direkt aufs Handy schreiben kannst"</li>
          <li>„Dass neue Kunden sofort einen Grund haben, bei dir anzufangen"</li>
          <li>„Dass du mehr Google-Bewertungen bekommst, ohne darum zu betteln"</li>
        </ul>
        <p className="text-[15px] text-muted-foreground mt-3">
          Sprich immer vom Ergebnis für den Inhaber, nicht von Technologie.
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {args.map((a) => (
          <Card key={a.title}>
            <div className="text-2xl mb-1">{a.icon}</div>
            <h4 className="font-semibold text-foreground mb-1">{a.title}</h4>
            <p className="text-[14px] text-muted-foreground">{a.text}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h3 className="text-lg font-semibold mb-3">Häufige Einwände & Antworten</h3>
        <div className="space-y-4">
          {objections.map((o) => (
            <div key={o.q}>
              <p className="font-medium text-foreground">„{o.q}"</p>
              <p className="text-[15px] text-muted-foreground mt-1">→ {o.a}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card accent>
        <h3 className="text-lg font-semibold mb-2">Was du NICHT tun solltest</h3>
        <ul className="space-y-2 text-[15px] text-muted-foreground">
          <li>❌ Nicht zu viel erklären – du verlierst den Inhaber spätestens nach Minute 3</li>
          <li>❌ Nicht „Software", „System" oder „Plattform" sagen – klingt nach IT-Projekt</li>
          <li>❌ Nicht auf Absagen frustriert reagieren – das gehört dazu</li>
          <li>❌ Keine Versprechen machen, die du nicht kennst („Wie viele Kunden bringt das?")</li>
        </ul>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-2">Dein Vorteil</h3>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Du hast ein Produkt, das funktioniert, einen echten Nutzen hat, und das du live vorführen kannst. Damit hast du mehr als die meisten
          Vertriebler je haben. <strong className="text-foreground">Der Rest ist Übung.</strong>
        </p>
      </Card>
    </>
  );
}

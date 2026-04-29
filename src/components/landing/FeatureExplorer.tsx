import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useAnimationFrame,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";

type Slide = { emoji: string; title: string; text: string };
type Tab = { id: string; label: string; emoji: string; slides: Slide[] };

const GRADIENT_COLORS = ["#5227FF", "#FF9FFC", "#B497CF"];
const ANIMATION_SPEED_S = 8;

const GradientText = ({ children }: { children: React.ReactNode }) => {
  const progress = useMotionValue(0);
  const elapsedRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const animationDuration = ANIMATION_SPEED_S * 1000;

  useAnimationFrame((time) => {
    if (lastTimeRef.current === null) {
      lastTimeRef.current = time;
      return;
    }
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;
    elapsedRef.current += deltaTime;
    const fullCycle = animationDuration * 2;
    const cycleTime = elapsedRef.current % fullCycle;
    if (cycleTime < animationDuration) {
      progress.set((cycleTime / animationDuration) * 100);
    } else {
      progress.set(100 - ((cycleTime - animationDuration) / animationDuration) * 100);
    }
  });

  const gradientColors = [...GRADIENT_COLORS, GRADIENT_COLORS[0]].join(", ");
  const backgroundPosition = useTransform(progress, (p) => `${p}% 50%`);

  return (
    <motion.span
      style={{
        backgroundImage: `linear-gradient(to right, ${gradientColors})`,
        backgroundSize: "300% 100%",
        backgroundPosition,
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        color: "transparent",
        display: "inline-block",
      }}
      className="font-bold text-2xl md:text-[28px] leading-tight"
    >
      {children}
    </motion.span>
  );
};

const AnimatedWords = ({ text, keyId }: { text: string; keyId: string }) => {
  const words = text.split(" ");
  return (
    <p className="text-[#1a1b21]/85 leading-relaxed text-base md:text-[17px] font-medium text-center">
      {words.map((word, i) => (
        <motion.span
          key={`${keyId}-${i}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
            delay: 0.1 + i * 0.022,
          }}
          style={{ display: "inline-block", marginRight: "0.28em" }}
        >
          {word}
        </motion.span>
      ))}
    </p>
  );
};

const TABS: Tab[] = [
  {
    id: "praemien",
    label: "Prämien",
    emoji: "🎯",
    slides: [
      { emoji: "🎯", title: "Warum Prämien besser sind als eine Punktekarte", text: "Kunden wählen selbst was sie wollen — das fühlt sich persönlicher an als ein automatischer Gratis-Kaffee nach dem zehnten Besuch. Wer wählen kann, kommt öfter wieder." },
      { emoji: "🏆", title: "Denk auch an die Treuen", text: "Bau eine große Traumprämie ein — etwas das sich wirklich lohnt drauf zu sparen. Das weckt Long-Term-Denken und macht aus Gelegenheitskunden echte Fans." },
    ],
  },
  {
    id: "empfehlungen",
    label: "Empfehlungen",
    emoji: "🔥",
    slides: [
      { emoji: "🔥", title: "Was wäre, wenn...", text: "Was wäre, wenn deine zufriedenen Kunden für dich neue Kunden ins Geschäft holen — ohne dass du einen Euro für Werbung ausgibst? Das ist kein Traum. Das ist Eloyo Empfehlungsmarketing." },
      { emoji: "💡", title: "Der wahre Wert eines Neukunden", text: "Ein neuer Kunde ist nicht nur ein Einkauf. Er ist ein potenzieller Stammkunde, der über Monate oder Jahre bei dir kauft. Jede erfolgreiche Empfehlung kann langfristig Hunderte Euro wert sein." },
      { emoji: "⚙️", title: "So funktioniert's", text: "Deine Kunden laden Freunde per WhatsApp ein. Der Freund hat 7 Tage Zeit bei dir vorbeizukommen und seinen ersten Karte zu sammeln. Erst wenn er wirklich einkauft und Punkte bekommt, zählt die Einladung." },
      { emoji: "🎁", title: "Was bekommt wer?", text: "Der Eingeladene bekommt doppelte Punkte beim ersten Karte. Der Einladende bekommt Bonuspunkte von dir — die du selbst festlegst." },
      { emoji: "🧮", title: "Die magische Formel", text: "Empfehle ca. 50% der Punkte einer Standardleistung als Einlader-Bonus. 2 erfolgreiche Einladungen = Gratis-Standardleistung. Das macht den Bonus unwiderstehlich." },
      { emoji: "🛡️", title: "Du bist geschützt", text: "Nur echte Neukunden können eingeladen werden. Wer schon Punkte hat, kann nicht nochmal eingeladen werden. Kein Missbrauch möglich." },
      { emoji: "🚀", title: "Der Schneeball-Effekt", text: "Jeder neue Kunde empfiehlt selbst weiter — weil er Bock hat sich etwas Gratis abzuholen. Dein Stammkundenkreis wächst organisch — ganz ohne Werbekosten." },
    ],
  },
  {
    id: "neukunden",
    label: "Neukunden",
    emoji: "✨",
    slides: [
      { emoji: "✨", title: "Dein stärkster Türöffner", text: "Jeder Neukunde bekommt beim ersten Besuch automatisch ein kleines Willkommensgeschenk — ohne dass du etwas sagen musst. Die Neukundenprämie arbeitet rund um die Uhr für dich." },
      { emoji: "📱", title: "Vollautomatisch", text: "Sobald ein Kunde zum ersten Mal bei dir scannt, erscheint sein Willkommensangebot auf seinem Handy. Er zeigt es dir an der Kasse — du gibst ihm sein Goodie. Kein Aufwand, keine Erklärung nötig." },
      { emoji: "🎪", title: "Kostenlose Werbung im Feed", text: "Deine Neukundenprämie wird allen Eloyo-Nutzern in deiner Umgebung angezeigt — auch denen die noch nie bei dir waren. Neue Gesichter in deinem Laden, ohne Werbekosten." },
      { emoji: "🔗", title: "Kunden direkt ins System ziehen", text: "Sprich Kunden an der Kasse an: „Ich schenk dir heute eine Shampooprobe — du musst nur kurz die App runterladen.\" Der Kunde lädt die App, bekommt sein Goodie, sieht deine Prämien — und kommt wieder." },
      { emoji: "🎀", title: "Was sich eignet", text: "Ein kleines Goodie — keine große Geste. Eine Shampooprobe, eine Kugel Eis extra, ein Gratis-Espresso. Klein genug um es jedem zu geben, groß genug um sich zu freuen." },
    ],
  },
  {
    id: "nachrichten",
    label: "Nachrichten",
    emoji: "📣",
    slides: [
      { emoji: "📣", title: "Der direkteste Kanal zu deinen Kunden", text: "E-Mails werden ignoriert. SMS kostet Geld. Push-Nachrichten erscheinen direkt auf dem Sperrbildschirm — selbst wenn niemand die App öffnet. Der Kanal, den bisher nur große Konzerne hatten. Ab jetzt auch du." },
      { emoji: "💬", title: "Was du schicken kannst", text: "Neue Angebote, freie Termine, neue Produkte, Sonderaktionen — alles geht. Du kannst sogar direkt Punkte mitschicken. Wer plötzlich eine Prämie freigeschalten hat, kommt vorbei." },
      { emoji: "🎯", title: "Zielgerichtet — nicht an alle", text: "Schreibe nur Kunden an die lange nicht da waren. Oder nur treue Stammkunden. Oder alle auf einmal. So bleibt deine Nachricht relevant und wirkt nicht wie Spam." },
      { emoji: "🔄", title: "Reaktivierung leicht gemacht", text: "Kunden die 3 Monate nicht da waren? Schick ihnen Bonuspunkte: „Wir vermissen dich — hier sind 10 Punkte als kleines Comeback-Geschenk.\" Das holt mehr zurück als jede Rabattaktion." },
      { emoji: "⚡", title: "2 Nachrichten pro Monat — kostenlos", text: "Im Starter-Paket kannst du 2 Push-Nachrichten pro Monat verschicken. Das hält es wertvoll — für dich und für deine Kunden." },
    ],
  },
  {
    id: "bewertungen",
    label: "Bewertungen",
    emoji: "⭐",
    slides: [
      { emoji: "⭐", title: "Mehr Google-Bewertungen ohne ein Wort zu sagen", text: "Du musst keinen Kunden mehr bitten dir eine Bewertung zu hinterlassen. Eloyo macht das automatisch — nach jedem Karte-Scan wird dem Kunden die Möglichkeit angezeigt, Punkte gegen eine Google-Bewertung zu tauschen." },
      { emoji: "📈", title: "Warum Google-Bewertungen so wichtig sind", text: "Mehr Bewertungen = höhere Sichtbarkeit bei Google = mehr Neukunden die deinen Laden finden. Die günstigste Form von Werbung — und sie funktioniert 24/7." },
      { emoji: "🎯", title: "Wie viele Punkte?", text: "5–15 Punkte für eine Google-Bewertung — das entspricht dem Wert eines normalen Einkaufs. Nicht zu wenig, nicht zu viel. 10 Punkte ist ein bewährter Startwert." },
      { emoji: "🛡️", title: "Nur echte Bewertungen", text: "Jeder Kunde kann nur einmal Punkte für eine Bewertung bekommen. Dein Google-Profil bleibt authentisch und glaubwürdig." },
    ],
  },
  {
    id: "automationen",
    label: "Automationen",
    emoji: "🎂",
    slides: [
      { emoji: "🎂", title: "Kein Kunde fühlt sich vergessen", text: "Jeder Kunde der bei dir Punkte gesammelt hat bekommt zu seinem Geburtstag automatisch eine persönliche Nachricht von dir. Du machst nichts — Eloyo verschickt sie von alleine." },
      { emoji: "🎁", title: "Punkte oder Angebot — du entscheidest", text: "Schick Bonuspunkte oder ein persönliches Angebot das an der Kasse eingelöst wird. Ein Haarschnitt für 10 Euro, ein Gratis-Eis — deine Entscheidung, deine Persönlichkeit." },
      { emoji: "✍️", title: "Zwei persönliche Sätze machen den Unterschied", text: "Eine individuelle Nachricht wirkt zehnmal echter als ein Standard-Text. Schreib zwei eigene Sätze — das bleibt im Gedächtnis und stärkt die Bindung." },
      { emoji: "🚀", title: "Einmal einrichten — für immer aktiv", text: "Du richtest die Geburtstagsautomation einmal ein und vergisst sie. Ab diesem Moment bekommt jeder Stammkunde zu seinem Geburtstag ein Lebenszeichen von dir — vollautomatisch." },
    ],
  },
];

const FeatureExplorer = () => {
  const [tabId, setTabId] = useState(TABS[0].id);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const tab = TABS.find((t) => t.id === tabId)!;
  const total = tab.slides.length;
  const slide = tab.slides[index];

  const switchTab = (id: string) => {
    if (id === tabId) return;
    setTabId(id);
    setIndex(0);
    setDirection(1);
  };

  const go = (dir: number) => {
    const next = Math.min(Math.max(index + dir, 0), total - 1);
    if (next === index) return;
    setDirection(dir);
    setIndex(next);
  };

  const goTo = (i: number) => {
    if (i === index) return;
    setDirection(i > index ? 1 : -1);
    setIndex(i);
  };

  return (
    <section className="relative z-10 py-24 px-6 bg-gradient-to-b from-[#faf8ff] via-[#f4f0ff] to-[#faf8ff]">
      <div className="max-w-5xl mx-auto">
        {/* Headline removed — replaced by section above */}
        {/* Tabs */}
        <div className="mb-8 -mx-6 px-6 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 md:gap-3 justify-start md:justify-center min-w-min pb-2">
            {TABS.map((t) => {
              const active = t.id === tabId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => switchTab(t.id)}
                  className={cn(
                    "relative flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm md:text-base whitespace-nowrap transition-all",
                    active
                      ? "bg-gradient-to-r from-[#5227FF] to-[#8B5CF6] text-white shadow-lg shadow-[#5227FF]/30"
                      : "bg-white/70 text-[#4a4455] hover:bg-white border border-[#e5e0f5]"
                  )}
                >
                  <span aria-hidden>{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Carousel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tabId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #f5f0ff 0%, #ede8ff 100%)",
              border: "1px solid rgba(82, 39, 255, 0.15)",
              borderRadius: "24px",
              boxShadow: "0 12px 40px rgba(82, 39, 255, 0.15)",
            }}
          >
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={index === 0}
              aria-label="Vorherige Karte"
              className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/90 hover:bg-white shadow-md disabled:opacity-30 disabled:hover:bg-white/90 flex items-center justify-center text-[#5227FF] transition-all backdrop-blur-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={index === total - 1}
              aria-label="Nächste Karte"
              className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/90 hover:bg-white shadow-md disabled:opacity-30 disabled:hover:bg-white/90 flex items-center justify-center text-[#5227FF] transition-all backdrop-blur-sm"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div
              className="relative px-14 md:px-20 py-12 md:py-16 overflow-hidden"
              style={{ minHeight: "320px" }}
            >
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={`${tabId}-${index}`}
                  custom={direction}
                  initial={{ x: direction * 80, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: direction * -80, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col items-center text-center max-w-2xl mx-auto"
                >
                  <div className="mb-5 select-none leading-none" style={{ fontSize: "72px" }} aria-hidden>
                    {slide.emoji}
                  </div>
                  <div className="mb-5">
                    <GradientText>{slide.title}</GradientText>
                  </div>
                  <AnimatedWords text={slide.text} keyId={`${tabId}-${index}`} />
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-center gap-2 pb-6">
              {tab.slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Karte ${i + 1}`}
                  className={cn(
                    "rounded-full transition-all",
                    i === index
                      ? "w-8 h-2 bg-[#5227FF]"
                      : "w-2 h-2 bg-[#5227FF]/25 hover:bg-[#5227FF]/50"
                  )}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default FeatureExplorer;

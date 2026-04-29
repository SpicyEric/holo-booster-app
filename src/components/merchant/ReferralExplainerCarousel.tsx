import { ExplainerCarousel, type ExplainerSlide } from "./ExplainerCarousel";

const slides: ExplainerSlide[] = [
  {
    emoji: "🔥",
    title: "Was wäre, wenn...",
    text: "Was wäre, wenn deine zufriedenen Kunden für dich neue Kunden ins Geschäft holen — ohne dass du einen Euro für Werbung ausgibst? Das ist kein Traum. Das ist Eloyo Empfehlungsmarketing.",
  },
  {
    emoji: "💡",
    title: "Der wahre Wert eines Neukunden",
    text: "Ein neuer Kunde ist nicht nur ein Einkauf. Er ist ein potenzieller Stammkunde, der über Monate oder Jahre bei dir kauft. Jede erfolgreiche Empfehlung kann langfristig Hunderte Euro wert sein.",
  },
  {
    emoji: "⚙️",
    title: "So funktioniert's",
    text: "Deine Kunden laden Freunde per WhatsApp ein. Der Freund hat 7 Tage Zeit, bei dir vorbeizukommen und seinen ersten Karte zu sammeln. Erst wenn er wirklich einkauft und Punkte bekommt, zählt die Einladung.",
  },
  {
    emoji: "🎁",
    title: "Was bekommt wer?",
    text: "Der Eingeladene bekommt doppelte Punkte beim ersten Karte — als Willkommensbonus. Der Einladende bekommt Bonuspunkte von dir — die du selbst festlegst.",
  },
  {
    emoji: "🧮",
    title: "Die magische Formel",
    text: "Empfehle ca. 50% der Punkte einer Standardleistung als Einlader-Bonus. Beispiel Barbershop: Haarschnitt = 160 Punkte → Einlader-Bonus = 80 Punkte → 2 Empfehlungen = Gratis-Haarschnitt.",
  },
  {
    emoji: "🛡️",
    title: "Du bist geschützt",
    text: "Nur echte Neukunden können eingeladen werden — wer bei dir schon Punkte hat, kann nicht nochmal eingeladen werden. Jede Person kann auch nur von einem Freund gleichzeitig eingeladen werden. Kein Missbrauch möglich.",
  },
  {
    emoji: "🚀",
    title: "Der Schneeball-Effekt",
    text: "Jeder Kunde, der durch eine Empfehlung kommt, empfiehlt sehr wahrscheinlich selbst weiter – weil es auch ihn reizt, sich etwas gratis abzuholen. Mit der Zeit wächst dein Stammkundenkreis organisch – ganz ohne Werbekosten.",
  },
];

export const ReferralExplainerCarousel = () => (
  <ExplainerCarousel
    slides={slides}
    finalNote="Du weißt jetzt alles. Stell deinen Bonus ein und leg los! 🚀"
  />
);

export default ReferralExplainerCarousel;

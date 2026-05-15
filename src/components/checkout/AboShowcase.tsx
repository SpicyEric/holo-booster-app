import nfcHalter from "@/assets/abo-nfc-halter.png";
import aufsteller from "@/assets/abo-aufsteller.png";
import appShot from "@/assets/abo-app-screenshot.png";

// Locked layout values (from sales-rep tuning):
// Ebene 1 (hinten): A5-Aufsteller — x 81%, y 50%, 320px
// Ebene 2: NFC-Kartenhalter      — x 49%, y 68%, 164px
// Ebene 3 (vorne): App Treuepass — x 59%, y 46%, 214px
const LAYERS = [
  { src: aufsteller, alt: "Eloyo A5-Aufsteller", x: 81, y: 50, size: 320 },
  { src: nfcHalter,  alt: "Eloyo NFC-Kartenhalter", x: 49, y: 68, size: 164 },
  { src: appShot,    alt: "Eloyo App Treuepass", x: 59, y: 46, size: 214 },
];

export const AboShowcase = () => {
  return (
    <div className="relative w-full h-72 overflow-hidden">
      {LAYERS.map((l, idx) => (
        <img
          key={idx}
          src={l.src}
          alt={l.alt}
          draggable={false}
          style={{
            position: "absolute",
            left: `${l.x}%`,
            top: `${l.y}%`,
            width: `${l.size}px`,
            transform: "translate(-50%, -50%)",
            objectFit: "contain",
            pointerEvents: "none",
            userSelect: "none",
            zIndex: idx + 1,
          }}
        />
      ))}
    </div>
  );
};

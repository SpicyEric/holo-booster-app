import nfcHalter from "@/assets/abo-nfc-halter.png";
import aufsteller from "@/assets/abo-aufsteller.png";
import appShot from "@/assets/abo-app-screenshot.png";

type ImgKey = "aufsteller" | "nfc" | "app";

const META: Record<ImgKey, { src: string; alt: string; x: number; y: number; size: number; z: number }> = {
  // Fixierte Positionen (X/Y in %, size in px). z = Stapelreihenfolge (höher = vorne).
  aufsteller: { src: aufsteller, alt: "A5-Aufsteller",   x: 100, y: 50, size: 320, z: 1 },
  nfc:        { src: nfcHalter,  alt: "NFC-Kartenhalter", x: 84,  y: 68, size: 164, z: 2 },
  app:        { src: appShot,    alt: "App Treuepass",    x: 53,  y: 46, size: 214, z: 3 },
};

export const AboShowcase = () => {
  const keys: ImgKey[] = ["aufsteller", "nfc", "app"];
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-visible">
      {keys.map((key) => {
        const m = META[key];
        return (
          <img
            key={key}
            src={m.src}
            alt={m.alt}
            draggable={false}
            style={{
              position: "absolute",
              left: `${m.x}%`,
              top: `${m.y}%`,
              width: `${m.size}px`,
              transform: "translate(-50%, -50%)",
              objectFit: "contain",
              userSelect: "none",
              zIndex: m.z,
            }}
          />
        );
      })}
    </div>
  );
};

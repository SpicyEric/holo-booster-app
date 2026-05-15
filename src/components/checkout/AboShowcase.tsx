import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Settings2, X } from "lucide-react";
import nfcHalter from "@/assets/abo-nfc-halter.png";
import aufsteller from "@/assets/abo-aufsteller.png";
import appShot from "@/assets/abo-app-screenshot.png";

type ImgKey = "aufsteller" | "nfc" | "app";

const META: Record<ImgKey, { src: string; alt: string; y: number; size: number; z: number }> = {
  // z = Stapelreihenfolge (höher = vorne)
  aufsteller: { src: aufsteller, alt: "A5-Aufsteller",   y: 50, size: 320, z: 1 },
  nfc:        { src: nfcHalter,  alt: "NFC-Kartenhalter", y: 68, size: 164, z: 2 },
  app:        { src: appShot,    alt: "App Treuepass",   y: 46, size: 214, z: 3 },
};

const STORAGE_KEY = "abo-showcase-x-v1";
const DEFAULT_X: Record<ImgKey, number> = { aufsteller: 81, nfc: 49, app: 59 };

function loadX(): Record<ImgKey, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_X, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_X;
}

export const AboShowcase = () => {
  const [xs, setXs] = useState<Record<ImgKey, number>>(loadX);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(xs)); } catch {}
  }, [xs]);

  const set = (key: ImgKey, v: number) => setXs((p) => ({ ...p, [key]: v }));
  const keys: ImgKey[] = ["aufsteller", "nfc", "app"];

  return (
    <>
      {/* Bilder-Layer: pointer-events-none, damit Text/Buttons darunter klickbar bleiben.
          overflow-visible: Bilder dürfen nach links über den Container hinausragen. */}
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
                left: `${xs[key]}%`,
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

      {/* Toggle: oben rechts in der Karte */}
      <button
        type="button"
        onClick={() => setEditing((v) => !v)}
        className="absolute top-2 right-2 z-50 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur text-[11px] font-medium border border-border hover:bg-background"
      >
        {editing ? <X className="w-3 h-3" /> : <Settings2 className="w-3 h-3" />}
        {editing ? "Schließen" : "Bilder anpassen"}
      </button>

      {editing && (
        <div className="relative z-40 mt-4 p-3 rounded-lg bg-muted/70 border border-border space-y-3 backdrop-blur">
          {keys.map((key) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="font-semibold">{META[key].alt}</span>
                <span>X {xs[key]}%</span>
              </div>
              <Slider
                value={[xs[key]]}
                min={-30}
                max={120}
                step={1}
                onValueChange={([v]) => set(key, v)}
              />
            </div>
          ))}
          <div className="flex justify-end">
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => setXs(DEFAULT_X)}>
              Zurücksetzen
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

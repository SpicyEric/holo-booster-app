import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Copy, ClipboardPaste, Settings2, X } from "lucide-react";
import { toast } from "sonner";
import nfcHalter from "@/assets/abo-nfc-halter.png";
import aufsteller from "@/assets/abo-aufsteller.png";
import appShot from "@/assets/abo-app-screenshot.png";

type ImgState = { x: number; y: number; size: number };
type LayoutState = { nfc: ImgState; aufsteller: ImgState; app: ImgState };

const STORAGE_KEY = "abo-showcase-layout-v1";
const DEFAULT_LAYOUT: LayoutState = {
  nfc: { x: 12, y: 50, size: 140 },
  aufsteller: { x: 50, y: 50, size: 160 },
  app: { x: 86, y: 50, size: 150 },
};

const IMAGES: { key: keyof LayoutState; src: string; alt: string }[] = [
  { key: "nfc", src: nfcHalter, alt: "Eloyo NFC-Kartenhalter" },
  { key: "aufsteller", src: aufsteller, alt: "Eloyo A5-Aufsteller" },
  { key: "app", src: appShot, alt: "Eloyo App Treuepass" },
];

function loadLayout(): LayoutState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_LAYOUT, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_LAYOUT;
}

export const AboShowcase = () => {
  const [layout, setLayout] = useState<LayoutState>(loadLayout);
  const [editing, setEditing] = useState(false);
  const [clipboard, setClipboard] = useState<ImgState | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {}
  }, [layout]);

  const update = (key: keyof LayoutState, patch: Partial<ImgState>) =>
    setLayout((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const copyOne = (key: keyof LayoutState) => {
    setClipboard(layout[key]);
    toast.success("Position & Größe kopiert");
  };

  const applyToAll = (key: keyof LayoutState) => {
    const src = layout[key];
    setLayout({
      nfc: { ...src },
      aufsteller: { ...src },
      app: { ...src },
    });
    toast.success("Auf alle Bilder übertragen");
  };

  const pasteOne = (key: keyof LayoutState) => {
    if (!clipboard) {
      toast.error("Nichts in der Zwischenablage");
      return;
    }
    update(key, clipboard);
  };

  return (
    <div className="space-y-4">
      <div className="relative w-full h-72 rounded-xl bg-gradient-to-br from-primary/10 via-background to-primary/5 overflow-hidden border border-primary/20">
        {IMAGES.map(({ key, src, alt }) => {
          const s = layout[key];
          return (
            <img
              key={key}
              src={src}
              alt={alt}
              draggable={false}
              style={{
                position: "absolute",
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: `${s.size}px`,
                transform: "translate(-50%, -50%)",
                objectFit: "contain",
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          );
        })}
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur text-[11px] font-medium border border-border hover:bg-background"
        >
          {editing ? <X className="w-3 h-3" /> : <Settings2 className="w-3 h-3" />}
          {editing ? "Schließen" : "Bilder anpassen"}
        </button>
      </div>

      {editing && (
        <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
          {IMAGES.map(({ key, alt }) => {
            const s = layout[key];
            return (
              <div key={key} className="space-y-2 pb-3 border-b border-border last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{alt}</span>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => copyOne(key)}>
                      <Copy className="w-3 h-3 mr-1" /> Kopieren
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => pasteOne(key)} disabled={!clipboard}>
                      <ClipboardPaste className="w-3 h-3 mr-1" /> Einfügen
                    </Button>
                    <Button type="button" size="sm" variant="secondary" className="h-7 px-2 text-[11px]" onClick={() => applyToAll(key)}>
                      Auf alle
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-[11px]">
                  <div>
                    <div className="flex justify-between mb-1"><span>X</span><span>{s.x}%</span></div>
                    <Slider value={[s.x]} min={0} max={100} step={1} onValueChange={([v]) => update(key, { x: v })} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1"><span>Y</span><span>{s.y}%</span></div>
                    <Slider value={[s.y]} min={0} max={100} step={1} onValueChange={([v]) => update(key, { y: v })} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1"><span>Größe</span><span>{s.size}px</span></div>
                    <Slider value={[s.size]} min={40} max={320} step={2} onValueChange={([v]) => update(key, { size: v })} />
                  </div>
                </div>
              </div>
            );
          })}
          <div className="flex justify-end">
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => setLayout(DEFAULT_LAYOUT)}>
              Zurücksetzen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

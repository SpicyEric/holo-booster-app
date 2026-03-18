import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Store, Upload, Clock,
  CheckCircle2, ChevronRight, ChevronLeft, Loader2,
  Package, ArrowLeft, MapPin, Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RichTextEditor from "@/components/merchant/RichTextEditor";
import eloyoLogo from "@/assets/eloyo-logo.png";

const INDUSTRIES = [
  { value: "cafe", label: "Café" },
  { value: "restaurant", label: "Restaurant" },
  { value: "shishabar", label: "Shishabar" },
  { value: "cbd-shop", label: "CBD-Shop" },
  { value: "baeckerei", label: "Bäckerei" },
  { value: "fashion-store", label: "Fashion Store" },
  { value: "barbershop", label: "Barbershop" },
  { value: "apotheke", label: "Apotheke" },
  { value: "supermarkt", label: "Supermarkt" },
  { value: "reformhaus", label: "Reformhaus" },
  { value: "vegan-restaurant", label: "Veganes Restaurant" },
  { value: "lieferservice", label: "Lieferservice" },
];

const DAYS = [
  { key: "monday", label: "Montag" },
  { key: "tuesday", label: "Dienstag" },
  { key: "wednesday", label: "Mittwoch" },
  { key: "thursday", label: "Donnerstag" },
  { key: "friday", label: "Freitag" },
  { key: "saturday", label: "Samstag" },
  { key: "sunday", label: "Sonntag" },
];

const TOTAL_STEPS = 3;

const stepMeta = [
  { icon: Package, title: "Box-ID verknüpfen", subtitle: "Verbinde deine Starterbox mit deinem Geschäft" },
  { icon: Store, title: "Name & Adresse", subtitle: "Geschäftsname, Branche und Standort" },
  { icon: Upload, title: "Profil vervollständigen", subtitle: "Titelbild, Beschreibung und Öffnungszeiten" },
];

export default function TestWizard() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Dummy form state
  const [boxId, setBoxId] = useState("");
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [description, setDescription] = useState("");
  const [openingHours, setOpeningHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>({});
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");

  const formatBoxIdInput = (value: string) => {
    const clean = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const parts = [];
    for (let i = 0; i < clean.length && i < 15; i += 5) {
      parts.push(clean.slice(i, i + 5));
    }
    return parts.join("-");
  };

  const adminGoTo = (targetStep: number) => {
    if (targetStep < 0 || targetStep >= TOTAL_STEPS) return;
    setDirection(targetStep > step ? 1 : -1);
    setStep(targetStep);
  };

  const goNext = () => {
    setDirection(1);
    if (step < TOTAL_STEPS - 1) setStep(s => s + 1);
  };

  const goBack = () => {
    setDirection(-1);
    if (step > 0) setStep(s => s - 1);
  };

  const meta = stepMeta[step];
  const Icon = meta.icon;
  const progress = ((step + 1) / TOTAL_STEPS) * 100;
  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Test Bar */}
      <div className="sticky top-0 z-20 bg-destructive/10 border-b-2 border-destructive/30">
        <div className="max-w-2xl mx-auto px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-destructive" />
            <span className="text-sm font-semibold text-destructive">Admin Test-Modus</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => adminGoTo(step - 1)}
              disabled={step === 0}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {step + 1} / {TOTAL_STEPS}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => adminGoTo(step + 1)}
              disabled={step === TOTAL_STEPS - 1}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Wizard Header (same as real) */}
      <div className="border-b border-border bg-card sticky top-[44px] z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src={eloyoLogo} alt="Eloyo" className="h-7 w-auto" />
          <span className="text-sm text-muted-foreground">
            Schritt {step + 1} von {TOTAL_STEPS}
          </span>
        </div>
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ x: direction > 0 ? 80 : -80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? -80 : 80, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Step Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{meta.title}</h2>
                <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
              </div>
            </div>

            {/* Step Content */}
            <div className="bg-card border border-border rounded-xl p-6">
              {/* Step 0: Box-ID */}
              {step === 0 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Du findest die Box-ID auf der Innenseite deiner Starterbox (Aufkleber).
                  </p>
                  <div>
                    <Label htmlFor="boxId">Box-ID</Label>
                    <Input
                      id="boxId"
                      placeholder="XXXXX-XXXXX-XXXXX"
                      value={boxId}
                      onChange={e => setBoxId(formatBoxIdInput(e.target.value))}
                      className="mt-1 font-mono text-lg tracking-wider"
                      maxLength={17}
                    />
                  </div>
                  <Button
                    onClick={() => goNext()}
                    disabled={boxId.length < 17}
                    className="w-full"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Box verknüpfen
                  </Button>
                </div>
              )}

              {/* Step 1: Name + Branche + Adresse */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <Label htmlFor="name">Geschäftsname *</Label>
                    <Input
                      id="name"
                      placeholder="z.B. Bäckerei Meier"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Branche</Label>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Branche wählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map(i => (
                          <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border-t border-border pt-5">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Adresse (Pflicht)</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Deine Adresse wird benötigt, damit Kunden dein Geschäft in der App finden können.
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <Label htmlFor="street">Straße *</Label>
                        <Input
                          id="street"
                          placeholder="Hauptstraße"
                          value={street}
                          onChange={e => setStreet(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="houseNumber">Nr.</Label>
                        <Input
                          id="houseNumber"
                          placeholder="12a"
                          value={houseNumber}
                          onChange={e => setHouseNumber(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div>
                        <Label htmlFor="postalCode">PLZ *</Label>
                        <Input
                          id="postalCode"
                          placeholder="10115"
                          value={postalCode}
                          onChange={e => setPostalCode(e.target.value)}
                          className="mt-1"
                          maxLength={5}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="city">Stadt *</Label>
                        <Input
                          id="city"
                          placeholder="Berlin"
                          value={city}
                          onChange={e => setCity(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      disabled
                      className="w-full mt-3"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Adresse prüfen (deaktiviert im Testmodus)
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Bild + Beschreibung + Öffnungszeiten */}
              {step === 2 && (
                <div className="space-y-6">
                  {/* Titelbild */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Upload className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Titelbild</span>
                    </div>
                    {coverUrl ? (
                      <div className="relative rounded-lg overflow-hidden">
                        <img src={coverUrl} alt="Titelbild" className="w-full h-40 object-cover" />
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute bottom-3 right-3"
                          onClick={() => setCoverUrl("")}
                        >
                          Ändern
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Bild auswählen</span>
                        <span className="text-xs text-muted-foreground mt-1">Empfohlen: 1200 × 400px</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = URL.createObjectURL(file);
                              setCoverUrl(url);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Beschreibung */}
                  <div className="border-t border-border pt-5">
                    <Label className="mb-2 block">Beschreibung</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Beschreibe dein Geschäft in ein paar Sätzen.
                    </p>
                    <RichTextEditor
                      value={description}
                      onChange={setDescription}
                      placeholder="Erzähl deinen Kunden etwas über dein Geschäft..."
                    />
                  </div>

                  {/* Öffnungszeiten */}
                  <div className="border-t border-border pt-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Öffnungszeiten</span>
                    </div>
                    <div className="space-y-3">
                      {DAYS.map(day => {
                        const dayData = openingHours[day.key] || { open: "09:00", close: "18:00", closed: false };
                        const isConfigured = !!openingHours[day.key];
                        return (
                          <div key={day.key} className="flex items-center gap-3">
                            <div className="w-20 text-sm font-medium text-foreground">{day.label}</div>
                            <Switch
                              checked={isConfigured && !dayData.closed}
                              onCheckedChange={(checked) => {
                                setOpeningHours(prev => ({
                                  ...prev,
                                  [day.key]: checked
                                    ? { open: prev[day.key]?.open || "09:00", close: prev[day.key]?.close || "18:00", closed: false }
                                    : { ...dayData, closed: true },
                                }));
                              }}
                            />
                            {isConfigured && !dayData.closed ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="time"
                                  value={dayData.open}
                                  onChange={e =>
                                    setOpeningHours(prev => ({
                                      ...prev,
                                      [day.key]: { ...dayData, open: e.target.value },
                                    }))
                                  }
                                  className="w-28 h-8 text-sm"
                                />
                                <span className="text-muted-foreground text-sm">–</span>
                                <Input
                                  type="time"
                                  value={dayData.close}
                                  onChange={e =>
                                    setOpeningHours(prev => ({
                                      ...prev,
                                      [day.key]: { ...dayData, close: e.target.value },
                                    }))
                                  }
                                  className="w-28 h-8 text-sm"
                                />
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                {isConfigured ? "Geschlossen" : "Nicht angegeben"}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation (same as real wizard) */}
        <div className="flex items-center justify-between mt-6">
          <div>
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={goBack}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Zurück
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step === 0 ? (
              <Button onClick={goNext} disabled={boxId.length < 17}>
                <Package className="h-4 w-4 mr-1" />
                Box verknüpfen
              </Button>
            ) : (
              <Button onClick={isLastStep ? () => alert("Wizard abgeschlossen!") : goNext}>
                {isLastStep ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Fertig
                  </>
                ) : (
                  <>
                    Weiter
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import { toast } from "sonner";
import { 
  Store, Upload, FileText, Clock, Share2, 
  CheckCircle2, ChevronRight, SkipForward, Loader2,
  Package, ArrowLeft, MapPin
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RichTextEditor from "@/components/merchant/RichTextEditor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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

const TOTAL_STEPS = 7;

const stepMeta = [
  { icon: Package, title: "Box-ID verknüpfen", subtitle: "Verbinde deine Starterbox mit deinem Geschäft" },
  { icon: Store, title: "Geschäftsname & Branche", subtitle: "Wie heißt dein Geschäft?" },
  { icon: Upload, title: "Titelbild hochladen", subtitle: "Wird auf deiner Stempelkarte angezeigt" },
  { icon: FileText, title: "Beschreibung", subtitle: "Erzähl deinen Kunden etwas über dein Geschäft" },
  { icon: Clock, title: "Öffnungszeiten", subtitle: "Wann können dich deine Kunden besuchen?" },
  { icon: MapPin, title: "Adresse", subtitle: "Wo befindet sich dein Geschäft?" },
  { icon: Share2, title: "Kontakt & Social Media", subtitle: "Wie können dich Kunden erreichen?" },
];

export default function MerchantSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Form state
  const [boxId, setBoxId] = useState("");
  const [boxLinked, setBoxLinked] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [description, setDescription] = useState("");
  const [openingHours, setOpeningHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>({});
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");

  // Address state
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (user?.id) loadCustomer();
  }, [user?.id]);

  const loadCustomer = async () => {
    try {
      const { data: assignment } = await supabase
        .from("merchant_assignments")
        .select("customer_id")
        .eq("merchant_user_id", user!.id)
        .maybeSingle();

      if (!assignment?.customer_id) {
        setLoading(false);
        return;
      }

      setCustomerId(assignment.customer_id);

      const { count } = await supabase
        .from("customer_boxes")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", assignment.customer_id);

      if (count && count > 0) {
        setBoxLinked(true);
        setStep(1);
      }

      const { data: customer } = await supabase
        .from("customers")
        .select("name, industry, cover_image_url, description, phone, website, instagram, opening_hours, street, house_number, postal_code, city, latitude, longitude")
        .eq("id", assignment.customer_id)
        .single();

      if (customer) {
        setName(customer.name || "");
        setIndustry(customer.industry || "");
        setCoverUrl(customer.cover_image_url || "");
        setDescription(customer.description || "");
        setPhone(customer.phone || "");
        setWebsite(customer.website || "");
        setInstagram(customer.instagram || "");
        setStreet(customer.street || "");
        setHouseNumber(customer.house_number || "");
        setPostalCode(customer.postal_code || "");
        setCity(customer.city || "");
        setLatitude(customer.latitude || null);
        setLongitude(customer.longitude || null);
        if (customer.opening_hours && typeof customer.opening_hours === "object") {
          setOpeningHours(customer.opening_hours as any);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatBoxIdInput = (value: string) => {
    const clean = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const parts = [];
    for (let i = 0; i < clean.length && i < 15; i += 5) {
      parts.push(clean.slice(i, i + 5));
    }
    return parts.join("-");
  };

  const handleLinkBox = async () => {
    if (!customerId || !boxId.trim()) return;

    const pattern = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;
    if (!pattern.test(boxId)) {
      toast.error("Ungültiges Format: XXXXX-XXXXX-XXXXX");
      return;
    }

    setSaving(true);
    try {
      const { data: boxData } = await supabase
        .from("boxes")
        .select("id, box_id, stamp_preset")
        .eq("box_id", boxId)
        .maybeSingle();

      if (!boxData) {
        toast.error("Box-ID existiert nicht");
        return;
      }

      const { count } = await supabase
        .from("customer_boxes")
        .select("id", { count: "exact", head: true })
        .eq("box_id", boxData.id);

      if (count && count > 0) {
        toast.error("Diese Box ist bereits vergeben");
        return;
      }

      await supabase.from("customer_boxes").insert({
        customer_id: customerId,
        box_id: boxData.id,
      });

      const preset = boxData.stamp_preset || "standard_3";
      const configs = preset === "standard_5"
        ? [
            { stamp_color: "grün", points_value: 1 },
            { stamp_color: "blau", points_value: 1 },
            { stamp_color: "rot", points_value: 1 },
            { stamp_color: "gelb", points_value: 1 },
            { stamp_color: "lila", points_value: 1 },
          ]
        : [
            { stamp_color: "grün", points_value: 1 },
            { stamp_color: "blau", points_value: 1 },
            { stamp_color: "rot", points_value: 1 },
          ];

      for (let i = 0; i < configs.length; i++) {
        await supabase.from("nfc_chips").insert({
          merchant_customer_id: customerId,
          chip_uid: `${customerId.substring(0, 8)}-${i + 1}`,
          stamp_name: `Stempel ${i + 1}`,
          stamp_color: configs[i].stamp_color,
          points_value: configs[i].points_value,
          is_active: true,
          is_default: i === 0,
        });
      }

      setBoxLinked(true);
      toast.success("Box erfolgreich verknüpft! 🎉");
      goNext();
    } catch {
      toast.error("Fehler beim Verknüpfen");
    } finally {
      setSaving(false);
    }
  };

  const handleCoverUpload = async (file: File) => {
    if (!customerId) return;
    setUploadingCover(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${customerId}/cover_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("customer-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("customer-assets").getPublicUrl(path);
      setCoverUrl(publicUrl);
      toast.success("Titelbild hochgeladen");
    } catch {
      toast.error("Fehler beim Hochladen");
    } finally {
      setUploadingCover(false);
    }
  };

  // Geocode address using the edge function
  const geocodeAddress = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    if (!street || !postalCode || !city) return null;
    setGeocoding(true);
    try {
      const { data, error } = await supabase.functions.invoke("geocode-address", {
        body: { street, houseNumber, postalCode, city },
      });
      if (error) throw error;
      if (data?.lat && data?.lng) {
        setLatitude(data.lat);
        setLongitude(data.lng);
        return { lat: data.lat, lng: data.lng };
      } else {
        toast.error("Adresse konnte nicht gefunden werden");
        return null;
      }
    } catch {
      toast.error("Geocoding fehlgeschlagen");
      return null;
    } finally {
      setGeocoding(false);
    }
  }, [street, houseNumber, postalCode, city]);

  const saveProgress = async () => {
    if (!customerId) return;
    setSaving(true);
    try {
      const updateData: Record<string, any> = {
        name: name || undefined,
        industry: industry || undefined,
        cover_image_url: coverUrl || undefined,
        description: description || undefined,
        phone: phone || undefined,
        website: website || undefined,
        instagram: instagram || undefined,
        opening_hours: Object.keys(openingHours).length > 0 ? openingHours : undefined,
        street: street || undefined,
        house_number: houseNumber || undefined,
        postal_code: postalCode || undefined,
        city: city || undefined,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        updated_at: new Date().toISOString(),
      };

      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) delete updateData[key];
      });

      await supabase.from("customers").update(updateData).eq("id", customerId);
    } catch {
      // Silent fail
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    setDirection(1);
    if (step < TOTAL_STEPS - 1) {
      setStep(s => s + 1);
    }
  };

  const goBack = () => {
    setDirection(-1);
    if (step > (boxLinked ? 1 : 0)) {
      setStep(s => s - 1);
    }
  };

  const handleSkip = () => {
    if (step === 0 || step === 5) return; // Can't skip box-id or address
    goNext();
  };

  const handleNextWithSave = async () => {
    if (step === 5) {
      if (!street.trim() || !postalCode.trim() || !city.trim()) {
        toast.error("Bitte fülle Straße, PLZ und Stadt aus");
        return;
      }
      if (!latitude || !longitude) {
        const result = await geocodeAddress();
        if (!result) {
          toast.error("Bitte klicke auf 'Adresse prüfen', um deinen Standort zu bestätigen");
          return;
        }
      }
    }
    await saveProgress();
    goNext();
  };

  const handleFinish = async () => {
    await saveProgress();
    toast.success("Geschäft eingerichtet! 🎉");
    navigate("/kunde");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!customerId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Kein Geschäft zugewiesen</h2>
          <p className="text-muted-foreground">Bitte kontaktiere support@eloyo.de</p>
        </div>
      </div>
    );
  }

  const isLastStep = step === TOTAL_STEPS - 1;
  const isAddressStep = step === 5;
  const canSkip = step > 0 && !isLastStep && !isAddressStep;
  const meta = stepMeta[step];
  const Icon = meta.icon;
  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const googleMapsEmbedUrl = latitude && longitude
    ? `https://www.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
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
            <div className="bg-card border border-border rounded-xl p-6 min-h-[200px]">
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
                    onClick={handleLinkBox}
                    disabled={boxId.length < 17 || saving}
                    className="w-full"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Package className="h-4 w-4 mr-2" />}
                    Box verknüpfen
                  </Button>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
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
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  {coverUrl ? (
                    <div className="relative rounded-lg overflow-hidden">
                      <img src={coverUrl} alt="Titelbild" className="w-full h-48 object-cover" />
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
                    <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                      {uploadingCover ? (
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">Bild auswählen</span>
                          <span className="text-xs text-muted-foreground mt-1">Empfohlen: 1200 × 400px</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleCoverUpload(file);
                        }}
                      />
                    </label>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Das Titelbild erscheint ganz oben auf deinem Geschäftsprofil in der App.
                  </p>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Beschreibe dein Geschäft in ein paar Sätzen. Du kannst Emojis, Fettschrift und Kursivschrift verwenden.
                  </p>
                  <RichTextEditor
                    value={description}
                    onChange={setDescription}
                    placeholder="Erzähl deinen Kunden etwas über dein Geschäft..."
                  />
                </div>
              )}

              {step === 4 && (
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
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Deine Adresse wird benötigt, damit Kunden dein Geschäft in der App finden können. <strong>Pflichtfeld.</strong>
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Label htmlFor="street">Straße *</Label>
                      <Input
                        id="street"
                        placeholder="Hauptstraße"
                        value={street}
                        onChange={e => { setStreet(e.target.value); setLatitude(null); setLongitude(null); }}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="houseNumber">Nr.</Label>
                      <Input
                        id="houseNumber"
                        placeholder="12a"
                        value={houseNumber}
                        onChange={e => { setHouseNumber(e.target.value); setLatitude(null); setLongitude(null); }}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="postalCode">PLZ *</Label>
                      <Input
                        id="postalCode"
                        placeholder="10115"
                        value={postalCode}
                        onChange={e => { setPostalCode(e.target.value); setLatitude(null); setLongitude(null); }}
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
                        onChange={e => { setCity(e.target.value); setLatitude(null); setLongitude(null); }}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={geocodeAddress}
                    disabled={geocoding || !street.trim() || !postalCode.trim() || !city.trim()}
                    className="w-full"
                  >
                    {geocoding ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <MapPin className="h-4 w-4 mr-2" />
                    )}
                    Adresse prüfen
                  </Button>

                  {latitude && longitude && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Standort gefunden</span>
                      </div>
                      <div className="rounded-lg overflow-hidden border border-border h-48">
                        <iframe
                          title="Standort-Vorschau"
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          src={googleMapsEmbedUrl!}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 6 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="phone">Telefonnummer</Label>
                    <Input id="phone" placeholder="+49 123 456789" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" placeholder="https://www.deingeschaeft.de" value={website} onChange={e => setWebsite(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input id="instagram" placeholder="@deingeschaeft" value={instagram} onChange={e => setInstagram(e.target.value)} className="mt-1" />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <div>
            {step > (boxLinked && step > 0 ? 1 : 0) && step > 0 && (
              <Button variant="ghost" size="sm" onClick={goBack}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Zurück
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {canSkip && (
              <Button variant="outline" size="sm" onClick={handleSkip}>
                <SkipForward className="h-4 w-4 mr-1" />
                Überspringen
              </Button>
            )}
            {step > 0 && (
              <Button onClick={isLastStep ? handleFinish : handleNextWithSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
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

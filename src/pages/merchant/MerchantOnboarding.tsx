import { forwardRef, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Loader2, Upload, Check, ImageIcon, Package, Sparkles, Gift, UserPlus,
  Star, Clock, Edit2, Plus, Trash2, Rocket, X, AlertCircle, Lightbulb,
} from "lucide-react";
import { isDemoMerchantActive } from "@/lib/demoMerchant";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { calculateSuggestion } from "../wizard/wizardLogic";
import { linkOrphanNfcChipsToMerchant } from "@/lib/nfcChipLinking";
import { cn } from "@/lib/utils";

interface OpeningHours {
  [key: string]: { open: string; close: string; closed: boolean };
}

interface DraftReward {
  id: string; // local
  title: string;
  points_required: number;
  image_url: string;
  saved: boolean;
}

const DAYS = [
  { key: "monday", label: "Montag" },
  { key: "tuesday", label: "Dienstag" },
  { key: "wednesday", label: "Mittwoch" },
  { key: "thursday", label: "Donnerstag" },
  { key: "friday", label: "Freitag" },
  { key: "saturday", label: "Samstag" },
  { key: "sunday", label: "Sonntag" },
];

function formatBoxIdInput(value: string) {
  const clean = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const parts: string[] = [];
  for (let i = 0; i < clean.length && i < 15; i += 5) parts.push(clean.slice(i, i + 5));
  return parts.join("-");
}

export default function MerchantOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);

  // Step 1
  const [coverUrl, setCoverUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Step 2
  const [cardId, setCardId] = useState("");
  const [cardIdLocked, setCardIdLocked] = useState(false);

  // Step 3
  const [avgRevenue, setAvgRevenue] = useState<number | "">("");
  const [card1Points, setCard1Points] = useState(10);
  const [card2Points, setCard2Points] = useState(20);
  const [card3Points, setCard3Points] = useState(40);

  // Step 4
  const [rewards, setRewards] = useState<DraftReward[]>([]);
  const [rewardForm, setRewardForm] = useState({ title: "", points_required: 50, image_url: "" });
  const [uploadingRewardImg, setUploadingRewardImg] = useState(false);

  // Step 5
  const [referralPoints, setReferralPoints] = useState(20);

  // Step 6
  const [ncoOpen, setNcoOpen] = useState(false);
  const [ncoSaved, setNcoSaved] = useState(false);
  const [ncoForm, setNcoForm] = useState({
    title: "",
    kind: "percent" as "percent" | "fixed" | "free",
    value: "",
  });

  // Step 7
  const [openingHours, setOpeningHours] = useState<OpeningHours>({});

  // Step 8
  const [description, setDescription] = useState("");

  // Validation refs
  const coverRef = useRef<HTMLDivElement | null>(null);
  const cardIdRef = useRef<HTMLDivElement | null>(null);
  const avgRef = useRef<HTMLDivElement | null>(null);
  const rewardsRef = useRef<HTMLDivElement | null>(null);
  const referralRef = useRef<HTMLDivElement | null>(null);
  const ncoRef = useRef<HTMLDivElement | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { resolveMerchantCustomerId } = await import("@/lib/resolveMerchantCustomerId");
        const cid = await resolveMerchantCustomerId(user.id);
        if (!cid) {
          setLoading(false);
          return;
        }
        setCustomerId(cid);

        const { data: customer } = await supabase
          .from("customers")
          .select("cover_image_url, logo_url, description, opening_hours, avg_revenue, referral_inviter_points, stamp_id")
          .eq("id", cid)
          .maybeSingle();

        if (customer) {
          setCoverUrl(customer.cover_image_url || "");
          setLogoUrl(customer.logo_url || "");
          setDescription(customer.description || "");
          if (customer.opening_hours) setOpeningHours(customer.opening_hours as OpeningHours);
          if ((customer as any).avg_revenue) setAvgRevenue((customer as any).avg_revenue);
          if ((customer as any).referral_inviter_points)
            setReferralPoints((customer as any).referral_inviter_points);
          if ((customer as any).stamp_id) {
            setCardId((customer as any).stamp_id);
            setCardIdLocked(true);
          }
        }

        // If a reward already exists → leave onboarding
        const { count } = await supabase
          .from("rewards")
          .select("id", { count: "exact", head: true })
          .eq("merchant_customer_id", cid);
        if ((count || 0) > 0) {
          navigate("/kunde", { replace: true });
          return;
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, navigate]);

  // Auto-suggest points based on avg revenue
  useEffect(() => {
    if (typeof avgRevenue !== "number" || avgRevenue <= 0) return;
    const suggestion = calculateSuggestion(avgRevenue, ["visits"], "balanced");
    if (suggestion.type === "tiered" && suggestion.tiers && suggestion.tiers.length >= 3) {
      setCard1Points(suggestion.tiers[0].points);
      setCard2Points(suggestion.tiers[1].points);
      setCard3Points(suggestion.tiers[2].points);
    }
  }, [avgRevenue]);

  const uploadFile = async (file: File, prefix: string): Promise<string | null> => {
    if (!customerId) return null;
    const ext = file.name.split(".").pop();
    const fileName = `${customerId}/${prefix}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("customer-assets").upload(fileName, file, { upsert: true });
    if (error) {
      toast.error("Fehler beim Hochladen");
      return null;
    }
    const { data: { publicUrl } } = supabase.storage.from("customer-assets").getPublicUrl(fileName);
    return publicUrl;
  };

  const handleAddReward = () => {
    if (!rewardForm.title.trim()) {
      toast.error("Bitte Titel eingeben");
      return;
    }
    if (rewards.length >= 5) return;
    setRewards((r) => [
      ...r,
      {
        id: `r-${Date.now()}`,
        title: rewardForm.title.trim(),
        points_required: rewardForm.points_required,
        image_url: rewardForm.image_url,
        saved: true,
      },
    ]);
    setRewardForm({ title: "", points_required: 50, image_url: "" });
  };

  const handleSaveNco = () => {
    if (!ncoForm.title.trim()) {
      toast.error("Bitte Titel eingeben");
      return;
    }
    setNcoSaved(true);
    setNcoOpen(false);
  };

  const isStep1Done = !!coverUrl;
  const isStep2Done = !!cardId && /^[A-Za-z0-9]{5}-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}$/.test(cardId);
  const isStep3Done = typeof avgRevenue === "number" && avgRevenue > 0 && card1Points > 0 && card2Points > 0 && card3Points > 0;
  const isStep4Done = rewards.length >= 1;
  const isStep5Done = referralPoints > 0;
  const isStep6Done = ncoSaved;

  const scrollTo = (ref: React.RefObject<HTMLDivElement>, key: string) => {
    setErrorField(key);
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleAddCardId = async () => {
    if (!customerId) return;
    if (!isStep2Done) {
      toast.error("Karten-ID muss im Format XXXXX-XXXXX-XXXXX sein");
      return;
    }
    const code = cardId.toUpperCase();
    const { data: boxData } = await supabase
      .from("boxes")
      .select("id, stamp_id, stamp_preset")
      .eq("stamp_id", code)
      .maybeSingle();
    if (!boxData) {
      toast.error("Karten-ID existiert nicht");
      return;
    }
    const { data: own } = await supabase
      .from("customer_boxes")
      .select("id")
      .eq("customer_id", customerId)
      .eq("box_id", boxData.id)
      .maybeSingle();
    if (!own) {
      const { count } = await supabase
        .from("customer_boxes")
        .select("id", { count: "exact", head: true })
        .eq("box_id", boxData.id);
      if ((count || 0) > 0) {
        toast.error("Karten-ID bereits vergeben");
        return;
      }
      await supabase.from("customer_boxes").insert({ customer_id: customerId, box_id: boxData.id });
      await supabase.from("customers").update({ stamp_id: code }).eq("id", customerId);
      const { data: eloyoBox } = await supabase
        .from("eloyo_boxes")
        .select("id")
        .eq("stempel_id", code)
        .in("status", ["versendet", "verfuegbar"])
        .maybeSingle();
      if (eloyoBox) {
        await supabase.from("eloyo_boxes").update({ haendler_id: customerId }).eq("id", eloyoBox.id);
      }
      await linkOrphanNfcChipsToMerchant(code, customerId);
      // Ensure 3 default chips exist
      const { data: existing } = await supabase
        .from("nfc_chips")
        .select("id, stamp_color")
        .eq("merchant_customer_id", customerId);
      const existingColors = new Set((existing || []).map((c) => c.stamp_color?.toLowerCase()));
      const defaults = [
        { stamp_name: "Karte 1", stamp_color: "grün" },
        { stamp_name: "Karte 2", stamp_color: "blau" },
        { stamp_name: "Karte 3", stamp_color: "rot" },
      ];
      for (let i = 0; i < defaults.length; i++) {
        if (existingColors.has(defaults[i].stamp_color)) continue;
        await supabase.from("nfc_chips").insert({
          merchant_customer_id: customerId,
          chip_uid: `${customerId.substring(0, 8)}-${defaults[i].stamp_color}`,
          stamp_name: defaults[i].stamp_name,
          stamp_color: defaults[i].stamp_color,
          points_value: 1,
          is_active: true,
          is_default: i === 0,
        });
      }
    }
    setCardIdLocked(true);
    toast.success("Karten-ID gespeichert");
  };

  const handleFinish = async () => {
    if (!customerId) return;
    if (!isStep1Done) return scrollTo(coverRef, "cover");
    if (!isStep2Done || !cardIdLocked) return scrollTo(cardIdRef, "cardId");
    if (!isStep3Done) return scrollTo(avgRef, "avg");
    if (!isStep4Done) return scrollTo(rewardsRef, "rewards");
    if (!isStep5Done) return scrollTo(referralRef, "referral");
    if (!isStep6Done) return scrollTo(ncoRef, "nco");

    setErrorField(null);
    setSaving(true);
    try {
      // 1) Update customer profile
      const customerUpdate: Record<string, any> = {
        cover_image_url: coverUrl,
        logo_url: logoUrl || null,
        description: description || null,
        opening_hours: openingHours,
        stamp_mode: "classic",
        manual_stamp_mode: true,
        avg_revenue: typeof avgRevenue === "number" ? avgRevenue : null,
        referral_enabled: true,
        referral_inviter_points: referralPoints,
        birthday_enabled: true,
        birthday_bonus_points: 20,
        winback_enabled: false,
        google_review_points_enabled: false,
        updated_at: new Date().toISOString(),
      };
      const { error: cErr } = await supabase.from("customers").update(customerUpdate).eq("id", customerId);
      if (cErr) console.warn("customer update", cErr);

      // 2) Update existing chip points in fixed order grün/blau/rot
      const { data: chips } = await supabase
        .from("nfc_chips")
        .select("id, stamp_color")
        .eq("merchant_customer_id", customerId);
      const order = ["grün", "blau", "rot"];
      const pts = [card1Points, card2Points, card3Points];
      const sorted = (chips || [])
        .filter((c) => order.includes((c.stamp_color || "").toLowerCase()))
        .sort((a, b) =>
          order.indexOf((a.stamp_color || "").toLowerCase()) - order.indexOf((b.stamp_color || "").toLowerCase()),
        );
      for (let i = 0; i < sorted.length && i < 3; i++) {
        await supabase.from("nfc_chips").update({ points_value: pts[i] }).eq("id", sorted[i].id);
      }

      // 3) Insert rewards
      for (const r of rewards) {
        await supabase.from("rewards").insert({
          merchant_customer_id: customerId,
          title: r.title,
          points_required: r.points_required,
          image_url: r.image_url || null,
          is_active: true,
        });
      }

      // 4) Insert NCO
      const ncoTitle =
        ncoForm.kind === "percent"
          ? `${ncoForm.value || ncoForm.title}% Rabatt: ${ncoForm.title}`.replace(/^%/, "")
          : ncoForm.title;
      const ncoDesc =
        ncoForm.kind === "percent"
          ? `${ncoForm.value}% Rabatt auf den ersten Einkauf`
          : ncoForm.kind === "fixed"
          ? `${ncoForm.value} € Rabatt auf den ersten Einkauf`
          : `Gratis: ${ncoForm.value || ncoForm.title}`;
      await supabase.from("new_customer_offers").insert({
        merchant_customer_id: customerId,
        title: ncoForm.title,
        description: ncoDesc,
        bonus_stamps: 0,
        is_active: true,
      });

      toast.success("Einrichtung abgeschlossen 🚀");
      navigate("/kunde", { replace: true });
    } catch (e) {
      console.error(e);
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!customerId) {
    return (
      <div className="min-h-screen p-8 text-center">
        <p className="text-muted-foreground">Kein Geschäft zugewiesen.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">🎉 Fast fertig – richte dein eloyo-Konto ein</h1>
          <p className="text-muted-foreground">Alles auf einen Blick. Wenn du fertig bist, bist du live.</p>
        </div>

        {/* Step 1 */}
        <Section ref={coverRef} number={1} title="Titelbild & Logo" done={isStep1Done} error={errorField === "cover"}>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Titelbild *</Label>
              <label className={cn(
                "block relative w-full h-40 rounded-xl bg-muted/40 border overflow-hidden cursor-pointer hover:border-primary/50 transition-colors",
                errorField === "cover" ? "border-destructive border-2" : "border-border",
              )}>
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  setUploadingCover(true);
                  const url = await uploadFile(f, "cover");
                  if (url) setCoverUrl(url);
                  setUploadingCover(false);
                }} />
                {coverUrl ? (
                  <img src={coverUrl} alt="Titelbild" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ImageIcon className="w-8 h-8" />
                    <span className="text-sm">Titelbild hochladen</span>
                  </div>
                )}
                {uploadingCover && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </label>
              <p className="text-xs text-muted-foreground mt-1">Erscheint oben im App-Profil deines Geschäfts.</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Logo (optional)</Label>
              <label className="block relative w-[120px] h-[120px] rounded-xl bg-muted/40 border border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-colors">
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  setUploadingLogo(true);
                  const url = await uploadFile(f, "logo");
                  if (url) setLogoUrl(url);
                  setUploadingLogo(false);
                }} />
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                )}
                {uploadingLogo && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}
              </label>
              <p className="text-xs text-muted-foreground mt-1">Kann später hinzugefügt werden.</p>
            </div>
          </div>
        </Section>

        {/* Step 2 */}
        <Section ref={cardIdRef} number={2} title="Karten-ID eingeben" done={isStep2Done && cardIdLocked} error={errorField === "cardId"}>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={cardId}
                onChange={(e) => { setCardId(formatBoxIdInput(e.target.value)); setCardIdLocked(false); }}
                placeholder="XXXXX-XXXXX-XXXXX"
                maxLength={17}
                className={cn("font-mono rounded-xl", errorField === "cardId" && "border-destructive")}
                disabled={cardIdLocked}
              />
              <Button onClick={handleAddCardId} disabled={cardIdLocked || !isStep2Done} className="rounded-xl">
                {cardIdLocked ? <Check className="h-4 w-4" /> : "Übernehmen"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Die Karten-ID findest du auf der Innenseite des Box-Deckels.</p>
          </div>
        </Section>

        {/* Step 3 */}
        <Section ref={avgRef} number={3} title="Punktesystem festlegen" done={isStep3Done} error={errorField === "avg"}>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Wie viel gibt ein Durchschnittskunde bei dir pro Besuch aus?</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="number"
                  min={1}
                  value={avgRevenue}
                  onChange={(e) => setAvgRevenue(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="z.B. 20"
                  className={cn("w-32 rounded-xl", errorField === "avg" && "border-destructive")}
                />
                <span className="text-muted-foreground">€</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Wir schlagen dir passende Punktwerte vor – frei änderbar.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: "Karte 1", value: card1Points, setter: setCard1Points },
                { label: "Karte 2", value: card2Points, setter: setCard2Points },
                { label: "Karte 3", value: card3Points, setter: setCard3Points },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-slate-900 text-white">
                  <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center font-bold">{i + 1}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className="text-xs text-white/50">Punkte</p>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={c.value}
                    onChange={(e) => c.setter(parseInt(e.target.value) || 1)}
                    className="h-9 w-20 bg-white text-slate-900 border-0 font-bold text-center"
                  />
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Step 4 */}
        <Section ref={rewardsRef} number={4} title="Erste Prämien erstellen" done={isStep4Done} error={errorField === "rewards"}>
          <div className="space-y-3">
            {rewards.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <Check className="w-5 h-5 text-emerald-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.points_required} Punkte</p>
                </div>
                <button onClick={() => setRewards((rs) => rs.filter((x) => x.id !== r.id))} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {rewards.length < 5 && (
              <div className={cn("p-4 rounded-xl border-2 border-dashed bg-muted/20 space-y-3", errorField === "rewards" && "border-destructive")}>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-2">
                  <Input
                    placeholder="Titel der Prämie (z.B. Kaffee gratis)"
                    value={rewardForm.title}
                    onChange={(e) => setRewardForm((f) => ({ ...f, title: e.target.value }))}
                    className="rounded-xl"
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={rewardForm.points_required}
                      onChange={(e) => setRewardForm((f) => ({ ...f, points_required: parseInt(e.target.value) || 1 }))}
                      className="rounded-xl"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Punkte</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground cursor-pointer hover:text-foreground inline-flex items-center gap-1">
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      setUploadingRewardImg(true);
                      const url = await uploadFile(f, "reward");
                      if (url) setRewardForm((rf) => ({ ...rf, image_url: url }));
                      setUploadingRewardImg(false);
                    }} />
                    {uploadingRewardImg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    {rewardForm.image_url ? "Bild geändert" : "Bild hochladen (optional)"}
                  </label>
                  {rewardForm.image_url && <img src={rewardForm.image_url} alt="" className="w-8 h-8 rounded object-cover" />}
                </div>
                <Button onClick={handleAddReward} className="w-full rounded-xl" variant="secondary">
                  <Plus className="w-4 h-4 mr-2" /> Prämie hinzufügen ({rewards.length}/5)
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Mindestens 1 Prämie ist erforderlich.</p>
          </div>
        </Section>

        {/* Step 5 */}
        <Section ref={referralRef} number={5} title="Weiterempfehlungs-Punkte" done={isStep5Done} error={errorField === "referral"}>
          <div>
            <Label className="text-sm">Wie viele Punkte bekommt ein Kunde, wenn er erfolgreich einen Freund einlädt?</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="number"
                min={1}
                value={referralPoints}
                onChange={(e) => setReferralPoints(parseInt(e.target.value) || 0)}
                className={cn("w-32 rounded-xl", errorField === "referral" && "border-destructive")}
              />
              <span className="text-muted-foreground text-sm">Punkte</span>
            </div>
          </div>
        </Section>

        {/* Step 6 */}
        <Section ref={ncoRef} number={6} title="Neukundenprämie erstellen" done={isStep6Done} error={errorField === "nco"}>
          {!ncoOpen && !ncoSaved && (
            <Button onClick={() => setNcoOpen(true)} className="rounded-xl" variant="secondary">
              <Rocket className="w-4 h-4 mr-2" /> Neukundenprämie erstellen
            </Button>
          )}
          {ncoOpen && (
            <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
              <div>
                <Label className="text-xs text-muted-foreground">Name der Prämie</Label>
                <Input
                  value={ncoForm.title}
                  onChange={(e) => setNcoForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="z.B. Willkommensbonus"
                  className="rounded-xl mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Art</Label>
                  <Select value={ncoForm.kind} onValueChange={(v: any) => setNcoForm((f) => ({ ...f, kind: v }))}>
                    <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Rabatt in %</SelectItem>
                      <SelectItem value="fixed">Festbetrag €</SelectItem>
                      <SelectItem value="free">Gratis-Produkt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {ncoForm.kind === "free" ? "Produkt" : "Wert"}
                  </Label>
                  <Input
                    value={ncoForm.value}
                    onChange={(e) => setNcoForm((f) => ({ ...f, value: e.target.value }))}
                    placeholder={ncoForm.kind === "percent" ? "20" : ncoForm.kind === "fixed" ? "5" : "z.B. Kaffee"}
                    className="rounded-xl mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveNco} className="rounded-xl flex-1">Speichern</Button>
                <Button onClick={() => setNcoOpen(false)} variant="outline" className="rounded-xl">Abbrechen</Button>
              </div>
            </div>
          )}
          {ncoSaved && !ncoOpen && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-medium">{ncoForm.title}</span>
              </div>
              <Button onClick={() => setNcoOpen(true)} variant="ghost" size="sm">
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Diese Prämie wird Kunden angezeigt, die noch keine Punkte bei dir gesammelt haben.
          </p>
        </Section>

        {/* Step 7 */}
        <Section number={7} title="Öffnungszeiten eintragen" optional done={Object.keys(openingHours).length > 0}>
          <div className="space-y-2">
            {DAYS.map((d) => {
              const h = openingHours[d.key] || { open: "09:00", close: "18:00", closed: false };
              const enabled = !!openingHours[d.key];
              return (
                <div key={d.key} className="flex items-center gap-3 text-sm">
                  <div className="w-24 font-medium">{d.label}</div>
                  <Switch
                    checked={enabled && !h.closed}
                    onCheckedChange={(v) => {
                      setOpeningHours((prev) => ({
                        ...prev,
                        [d.key]: v ? { open: h.open, close: h.close, closed: false } : { ...h, closed: true },
                      }));
                    }}
                  />
                  {enabled && !h.closed ? (
                    <>
                      <Input
                        type="time"
                        value={h.open}
                        onChange={(e) => setOpeningHours((p) => ({ ...p, [d.key]: { ...h, open: e.target.value } }))}
                        className="w-28 rounded-lg"
                      />
                      <span>–</span>
                      <Input
                        type="time"
                        value={h.close}
                        onChange={(e) => setOpeningHours((p) => ({ ...p, [d.key]: { ...h, close: e.target.value } }))}
                        className="w-28 rounded-lg"
                      />
                    </>
                  ) : (
                    <span className="text-muted-foreground text-xs">Geschlossen</span>
                  )}
                </div>
              );
            })}
          </div>
        </Section>

        {/* Step 8 */}
        <Section number={8} title="Kurze Beschreibung für dein Profil" optional done={!!description.trim()}>
          <Textarea
            maxLength={300}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Erzähle in wenigen Sätzen, was dein Geschäft besonders macht..."
            className="rounded-xl"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {description.length}/300 – Wird Kunden in der eloyo-App angezeigt.
          </p>
        </Section>
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-border z-30">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Button
            onClick={handleFinish}
            disabled={saving}
            size="lg"
            className="w-full rounded-xl text-base h-12 bg-gradient-to-r from-primary to-[hsl(262,80%,70%)]"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Rocket className="h-5 w-5 mr-2" />}
            Einrichtung abschließen & loslegen
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SectionProps {
  number: number;
  title: string;
  done?: boolean;
  optional?: boolean;
  error?: boolean;
  children: React.ReactNode;
}

const Section = forwardRef<HTMLDivElement, SectionProps>(function Section(
  { number, title, done, optional, error, children },
  ref,
) {
  return (
    <div ref={ref} className="scroll-mt-20">
      <Card className={cn(
        "rounded-2xl border-2 transition-colors",
        done ? "border-emerald-200 bg-emerald-50/30" : error ? "border-destructive bg-destructive/5" : "border-border bg-white",
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
              done ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary",
            )}>
              {done ? <Check className="w-5 h-5" /> : number}
            </div>
            <div className="flex-1">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                Schritt {number}: {title}
                {optional && <span className="text-xs font-normal text-muted-foreground">(optional)</span>}
              </CardTitle>
            </div>
            {error && <AlertCircle className="w-5 h-5 text-destructive" />}
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
});

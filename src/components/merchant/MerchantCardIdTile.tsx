import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { resolveMerchantCustomerId } from "@/lib/resolveMerchantCustomerId";
import { linkOrphanNfcChipsToMerchant } from "@/lib/nfcChipLinking";

interface CustomerBox { id: string; box_id: string; stamp_code: string; assigned_at: string }

const formatBoxIdInput = (value: string) => {
  const clean = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const parts: string[] = [];
  for (let i = 0; i < clean.length && i < 15; i += 5) parts.push(clean.slice(i, i + 5));
  return parts.join("-");
};

const createDefaultStamps = async (boxPreset: string, merchantCustomerId: string) => {
  const presets: Record<string, { stamp_name: string; stamp_color: string; points_value: number }[]> = {
    standard_3: [
      { stamp_name: "Karte 1", stamp_color: "grün", points_value: 1 },
      { stamp_name: "Karte 2", stamp_color: "blau", points_value: 1 },
      { stamp_name: "Karte 3", stamp_color: "rot", points_value: 1 },
    ],
    standard_5: [
      { stamp_name: "Karte 1", stamp_color: "grün", points_value: 1 },
      { stamp_name: "Karte 2", stamp_color: "blau", points_value: 1 },
      { stamp_name: "Karte 3", stamp_color: "rot", points_value: 1 },
      { stamp_name: "Karte 4", stamp_color: "gelb", points_value: 1 },
      { stamp_name: "Karte 5", stamp_color: "lila", points_value: 1 },
    ],
  };
  const list = presets[boxPreset] || presets.standard_3;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    const { data: existing } = await supabase
      .from("nfc_chips").select("id")
      .eq("merchant_customer_id", merchantCustomerId)
      .eq("stamp_color", c.stamp_color).maybeSingle();
    if (existing) continue;
    await supabase.from("nfc_chips").insert({
      merchant_customer_id: merchantCustomerId,
      chip_uid: `${merchantCustomerId.substring(0, 8)}-${c.stamp_color}`,
      stamp_name: c.stamp_name, stamp_color: c.stamp_color,
      points_value: c.points_value, is_active: true, is_default: i === 0,
    });
  }
};

export default function MerchantCardIdTile() {
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [boxes, setBoxes] = useState<CustomerBox[]>([]);
  const [newBoxId, setNewBoxId] = useState("");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadBoxes = async (cid: string) => {
    const { data } = await supabase
      .from("customer_boxes")
      .select(`id, box_id, assigned_at, boxes:box_id (stamp_id)`)
      .eq("customer_id", cid)
      .order("assigned_at", { ascending: false });
    if (data) {
      setBoxes(data.map((b: any) => ({
        id: b.id, box_id: b.box_id,
        stamp_code: b.boxes?.stamp_id || "Unbekannt",
        assigned_at: b.assigned_at,
      })));
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) return;
      const cid = await resolveMerchantCustomerId(user.id);
      if (cancelled) return;
      setCustomerId(cid);
      if (cid) await loadBoxes(cid);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleAdd = async () => {
    if (!customerId || !newBoxId.trim()) return;
    const pattern = /^[A-Za-z0-9]{5}-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}$/;
    if (!pattern.test(newBoxId.trim())) {
      toast.error("Ungültiges Format: XXXXX-XXXXX-XXXXX");
      return;
    }
    setAdding(true);
    try {
      const stampIdValue = newBoxId.trim().toUpperCase();
      const { data: boxData } = await supabase
        .from("boxes").select("id, stamp_id, stamp_preset")
        .eq("stamp_id", stampIdValue).maybeSingle();
      if (!boxData) { toast.error("Karten-ID existiert nicht"); return; }

      const { data: own } = await supabase
        .from("customer_boxes").select("id")
        .eq("customer_id", customerId).eq("box_id", boxData.id).maybeSingle();
      if (own) { toast.error("Karten-ID bereits verknüpft"); return; }

      const { count } = await supabase
        .from("customer_boxes").select("id", { count: "exact", head: true })
        .eq("box_id", boxData.id);
      if (count && count > 0) { toast.error("Karten-ID bereits vergeben"); return; }

      await supabase.from("customer_boxes").insert({ customer_id: customerId, box_id: boxData.id });
      await supabase.from("customers").update({ stamp_id: stampIdValue }).eq("id", customerId);

      const { data: eloyoBox } = await supabase
        .from("eloyo_boxes").select("id").eq("stempel_id", stampIdValue)
        .in("status", ["versendet", "verfuegbar"]).maybeSingle();
      if (eloyoBox) {
        await supabase.from("eloyo_boxes").update({ haendler_id: customerId }).eq("id", eloyoBox.id);
      }

      await linkOrphanNfcChipsToMerchant(stampIdValue, customerId);
      await createDefaultStamps(boxData.stamp_preset || "standard_3", customerId);

      toast.success("Karten-ID hinzugefügt");
      setNewBoxId("");
      await loadBoxes(customerId);
    } catch {
      toast.error("Fehler");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card className="rounded-2xl shadow-sm border-0 bg-gray-50/80">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">Karten-ID</CardTitle>
            <CardDescription>Verknüpfe deine Karten-ID, damit deine NFC-Karten funktionieren.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <>
            {boxes.length > 0 && (
              <div className="space-y-3">
                {boxes.map((box) => (
                  <div key={box.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                    <code className="font-mono text-sm font-semibold text-gray-900">{box.stamp_code}</code>
                    <span className="text-xs text-gray-500">Hinzugefügt: {new Date(box.assigned_at).toLocaleDateString("de-DE")}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <Input
                value={newBoxId}
                onChange={(e) => setNewBoxId(formatBoxIdInput(e.target.value))}
                placeholder="XXXXX-XXXXX-XXXXX"
                className="font-mono rounded-xl"
                maxLength={17}
              />
              <Button onClick={handleAdd} disabled={adding || !newBoxId.trim()} className="rounded-xl">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

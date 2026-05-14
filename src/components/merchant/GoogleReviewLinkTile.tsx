import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Star, ExternalLink, Copy, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props { customerId: string }

export default function GoogleReviewLinkTile({ customerId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("customers")
        .select("google_review_url")
        .eq("id", customerId)
        .single();
      if (!cancelled && data) setUrl((data as any).google_review_url || "");
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [customerId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("customers")
        .update({ google_review_url: url, updated_at: new Date().toISOString() })
        .eq("id", customerId);
      if (error) throw error;
      toast.success("Google-Bewertungslink gespeichert");
    } catch (e: any) {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const copy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link kopiert");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="rounded-xl border border-border/60 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
        <h3 className="text-sm font-semibold text-foreground">Google-Bewertungen</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Hinterlege deinen Google-Bewertungslink. Er wird Kunden nach dem Scannen angezeigt, damit sie dich direkt bei Google bewerten können.
      </p>
      <Label htmlFor="google_review_url_tile" className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
        Google-Bewertungslink
      </Label>
      <div className="flex gap-2">
        <Input
          id="google_review_url_tile"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://g.page/r/..."
          disabled={loading}
          className="rounded-lg"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={copy}
          disabled={!url}
          className="rounded-lg shrink-0"
          title="Link kopieren"
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
      <div className="flex gap-2 mt-3">
        <Button onClick={handleSave} disabled={saving || loading} size="sm" className="rounded-lg">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Speichern…</> : "Speichern"}
        </Button>
        {url && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open(url, "_blank")}
            className="rounded-lg"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Link testen
          </Button>
        )}
      </div>
    </Card>
  );
}

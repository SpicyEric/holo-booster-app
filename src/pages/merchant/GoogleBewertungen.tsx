import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Star, ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { appSupabase } from "@/integrations/app-supabase/client";
import { useAuth } from "@/hooks/useAuth";

const GoogleBewertungen = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchMerchant = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await appSupabase
          .from("merchants")
          .select("id, google_review_url")
          .eq("owner_user_id", user.id)
          .single();
        
        if (error && error.code !== "PGRST116") {
          console.error("Error fetching merchant:", error);
          return;
        }
        
        if (data) {
          const merchantData = data as any;
          setMerchantId(merchantData.id);
          setGoogleReviewUrl(merchantData.google_review_url || "");
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMerchant();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    try {
      if (merchantId) {
        const { error } = await (appSupabase
          .from("merchants") as any)
          .update({ 
            google_review_url: googleReviewUrl,
            updated_at: new Date().toISOString() 
          })
          .eq("id", merchantId);
        
        if (error) throw error;
      } else {
        const { data, error } = await (appSupabase
          .from("merchants") as any)
          .insert({
            owner_user_id: user.id,
            google_review_url: googleReviewUrl,
            name: "Mein Geschäft",
            lat: 0,
            lng: 0,
          })
          .select()
          .single();
        
        if (error) throw error;
        if (data) setMerchantId(data.id);
      }
      
      toast.success("Google-Bewertungslink gespeichert!");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = () => {
    if (googleReviewUrl) {
      navigator.clipboard.writeText(googleReviewUrl);
      setCopied(true);
      toast.success("Link kopiert!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 sm:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Google-Bewertungen</h1>
        <p className="text-muted-foreground">
          Verwalte deinen Google-Bewertungslink und erhalte mehr Bewertungen von deinen Kunden.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Google Review Link Card */}
        <Card className="p-6 border-amber-200 bg-amber-50/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Star className="w-6 h-6 text-amber-600 fill-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-800 mb-2">
                Dein Google-Bewertungslink
              </h3>
              <p className="text-sm text-amber-700 mb-4">
                Dieser Link wird nach dem Stempeln angezeigt, damit Kunden dich direkt bei Google bewerten können. 
                Mehr Bewertungen bedeuten mehr Sichtbarkeit!
              </p>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="google_review_url">Google Bewertungslink</Label>
                  <div className="flex gap-2 mt-1">
                    <div className="relative flex-1">
                      <Star className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                      <Input
                        id="google_review_url"
                        value={googleReviewUrl}
                        onChange={(e) => setGoogleReviewUrl(e.target.value)}
                        placeholder="https://g.page/r/..."
                        className="pl-10 bg-white"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyToClipboard}
                      disabled={!googleReviewUrl}
                    >
                      {copied ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Speichern..." : "Speichern"}
                  </Button>
                  {googleReviewUrl && (
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(googleReviewUrl, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Link testen
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* How to get Google Review Link */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">So findest du deinen Google-Bewertungslink</h3>
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li>
              Öffne <a 
                href="https://business.google.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google Business Profile
              </a>
            </li>
            <li>Wähle dein Geschäft aus</li>
            <li>Klicke auf "Kunden" → "Bewertungen"</li>
            <li>Klicke auf "Teilen" oder "Weitere Bewertungen erhalten"</li>
            <li>Kopiere den Link und füge ihn hier ein</li>
          </ol>
        </Card>

        {/* Stats Card (Placeholder) */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Bewertungs-Statistiken</h3>
          <p className="text-muted-foreground text-sm">
            Hier werden bald deine Bewertungs-Statistiken angezeigt, z.B. wie viele Kunden nach dem Stempeln eine Bewertung abgegeben haben.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">-</div>
              <div className="text-xs text-muted-foreground">Anfragen gesendet</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">-</div>
              <div className="text-xs text-muted-foreground">Bewertungen erhalten</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">-%</div>
              <div className="text-xs text-muted-foreground">Conversion Rate</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default GoogleBewertungen;

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Star, ExternalLink, Copy, CheckCircle2, Bot, Loader2, Gift, Monitor, Search, MousePointer, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const GoogleBewertungen = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAutoReply, setSavingAutoReply] = useState(false);
  const [savingReviewPoints, setSavingReviewPoints] = useState(false);
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Auto-Reply State
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyMinRating, setAutoReplyMinRating] = useState(4);
  
  // Review Points State
  const [reviewPointsEnabled, setReviewPointsEnabled] = useState(false);
  const [reviewPointsValue, setReviewPointsValue] = useState(5);

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!user?.id) return;
      
      try {
        const { data: linkData } = await supabase
          .from("customer_users")
          .select("customer_id")
          .eq("user_id", user.id)
          .single();
        
        if (linkData?.customer_id) {
          setCustomerId(linkData.customer_id);
          
          const { data: customerData, error } = await supabase
            .from("customers")
            .select("id, google_review_url, auto_reply_enabled, auto_reply_min_rating, google_review_points_enabled, google_review_points_value")
            .eq("id", linkData.customer_id)
            .single();
          
          if (error && error.code !== "PGRST116") {
            console.error("Error fetching customer:", error);
            return;
          }
          
          if (customerData) {
            setGoogleReviewUrl(customerData.google_review_url || "");
            setAutoReplyEnabled(customerData.auto_reply_enabled || false);
            setAutoReplyMinRating(customerData.auto_reply_min_rating || 4);
            setReviewPointsEnabled(customerData.google_review_points_enabled || false);
            setReviewPointsValue(customerData.google_review_points_value || 5);
          }
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCustomer();
  }, [user?.id]);

  const handleSave = async () => {
    if (!customerId) {
      toast.error("Kein Kundenprofil gefunden");
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("customers")
        .update({ 
          google_review_url: googleReviewUrl,
          updated_at: new Date().toISOString() 
        })
        .eq("id", customerId);
      
      if (error) throw error;
      
      toast.success("Google-Bewertungslink gespeichert!");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAutoReply = async () => {
    if (!customerId) {
      toast.error("Kein Kundenprofil gefunden");
      return;
    }
    
    setSavingAutoReply(true);
    try {
      const { error } = await supabase
        .from("customers")
        .update({ 
          auto_reply_enabled: autoReplyEnabled,
          auto_reply_min_rating: autoReplyMinRating,
          updated_at: new Date().toISOString() 
        })
        .eq("id", customerId);
      
      if (error) throw error;
      
      toast.success("Auto-Reply Einstellungen gespeichert!");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Fehler beim Speichern");
    } finally {
      setSavingAutoReply(false);
    }
  };

  const handleSaveReviewPoints = async () => {
    if (!customerId) {
      toast.error("Kein Kundenprofil gefunden");
      return;
    }
    
    setSavingReviewPoints(true);
    try {
      const { error } = await supabase
        .from("customers")
        .update({ 
          google_review_points_enabled: reviewPointsEnabled,
          google_review_points_value: reviewPointsValue,
          updated_at: new Date().toISOString() 
        })
        .eq("id", customerId);
      
      if (error) throw error;
      
      toast.success("Bewertungs-Punkte Einstellungen gespeichert!");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Fehler beim Speichern");
    } finally {
      setSavingReviewPoints(false);
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-6 sm:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Google-Bewertungen</h1>
          <p className="text-gray-500 mt-1">
            Verwalte deinen Google-Bewertungslink und erhalte mehr Bewertungen von deinen Kunden.
          </p>
        </div>

        <div className="grid gap-6">
          {/* Google Review Link Card */}
          <Card className="p-6 rounded-2xl shadow-sm border-0 bg-amber-50/80">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Star className="w-6 h-6 text-amber-600 fill-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-900 mb-2">
                  Dein Google-Bewertungslink
                </h3>
                <p className="text-sm text-amber-700 mb-4">
                  Dieser Link wird nach dem Stempeln angezeigt, damit Kunden dich direkt bei Google bewerten können. 
                  Mehr Bewertungen bedeuten mehr Sichtbarkeit!
                </p>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="google_review_url" className="text-amber-800">Google Bewertungslink</Label>
                    <div className="flex gap-2 mt-1">
                      <div className="relative flex-1">
                        <Star className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                        <Input
                          id="google_review_url"
                          value={googleReviewUrl}
                          onChange={(e) => setGoogleReviewUrl(e.target.value)}
                          placeholder="https://g.page/r/..."
                          className="pl-10 bg-white rounded-xl border-amber-200 focus:border-amber-400 focus:ring-amber-400"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={copyToClipboard}
                        disabled={!googleReviewUrl}
                        className="rounded-xl border-amber-200 hover:bg-amber-100"
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
                    <Button onClick={handleSave} disabled={saving} className="rounded-xl">
                      {saving ? "Speichern..." : "Speichern"}
                    </Button>
                    {googleReviewUrl && (
                      <Button 
                        variant="outline" 
                        onClick={() => window.open(googleReviewUrl, '_blank')}
                        className="rounded-xl"
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

          {/* Review Points Card */}
          <Card className="p-6 rounded-2xl shadow-sm border-0 bg-green-50/80">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <Gift className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  Punkte für Google-Bewertungen
                </h3>
                <p className="text-sm text-green-700 mb-4">
                  Belohne Kunden mit Bonuspunkten, wenn sie eine Google-Bewertung hinterlassen. 
                  Jeder Kunde kann den Bonus einmalig erhalten.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">Bewertungs-Bonus aktivieren</p>
                      <p className="text-sm text-gray-500">Kunden erhalten Punkte nach einer Google-Bewertung</p>
                    </div>
                    <Switch
                      checked={reviewPointsEnabled}
                      onCheckedChange={setReviewPointsEnabled}
                    />
                  </div>
                  
                  {reviewPointsEnabled && (
                    <div className="p-4 bg-white rounded-xl space-y-3">
                      <div>
                        <Label className="text-gray-700">Punkte pro Bewertung</Label>
                        <p className="text-sm text-gray-500 mb-3">
                          Wie viele Bonuspunkte soll ein Kunde für eine Bewertung erhalten?
                        </p>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[reviewPointsValue]}
                            onValueChange={(val) => setReviewPointsValue(val[0])}
                            min={1}
                            max={20}
                            step={1}
                            className="flex-1"
                          />
                          <span className="text-lg font-bold text-green-700 min-w-[3rem] text-center">
                            {reviewPointsValue}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Button onClick={handleSaveReviewPoints} disabled={savingReviewPoints} className="rounded-xl">
                    {savingReviewPoints ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Speichern...
                      </>
                    ) : (
                      "Einstellungen speichern"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Auto-Reply Card - Coming Soon */}
          <Card className="p-6 rounded-2xl shadow-sm border-0 bg-blue-50/40 relative overflow-hidden opacity-60 pointer-events-none select-none">
            <div className="absolute top-3 right-3 z-10 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full pointer-events-auto">
              Demnächst verfügbar
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900/60 mb-2">
                  Automatische Antworten
                </h3>
                <p className="text-sm text-blue-700/60 mb-4">
                  Lassen Sie KI automatisch auf Google-Bewertungen antworten. 
                  Professionelle, personalisierte Antworten werden für Sie erstellt.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/60 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-500">Auto-Reply aktivieren</p>
                      <p className="text-sm text-gray-400">KI beantwortet neue Bewertungen automatisch</p>
                    </div>
                    <Switch checked={false} disabled />
                  </div>
                  
                  <Button disabled className="rounded-xl">
                    Einstellungen speichern
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* How to get Google Review Link */}
          <Card className="p-6 rounded-2xl shadow-sm border-0 bg-gray-50/80">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">So findest du deinen Google-Bewertungslink</h3>
            <ol className="list-decimal list-inside space-y-3 text-gray-600">
              <li>
                Öffne <a 
                  href="https://business.google.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
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

        </div>
      </div>
    </div>
  );
};

export default GoogleBewertungen;
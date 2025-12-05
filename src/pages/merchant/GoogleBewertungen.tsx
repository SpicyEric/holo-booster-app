import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Star, ExternalLink, Copy, CheckCircle2, Bot, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const GoogleBewertungen = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAutoReply, setSavingAutoReply] = useState(false);
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Auto-Reply State
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyMinRating, setAutoReplyMinRating] = useState(4);

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
            .select("id, google_review_url, auto_reply_enabled, auto_reply_min_rating")
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

          {/* Auto-Reply Card */}
          <Card className="p-6 rounded-2xl shadow-sm border-0 bg-blue-50/80">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Automatische Antworten
                </h3>
                <p className="text-sm text-blue-700 mb-4">
                  Lassen Sie KI automatisch auf Google-Bewertungen antworten. 
                  Professionelle, personalisierte Antworten werden für Sie erstellt.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">Auto-Reply aktivieren</p>
                      <p className="text-sm text-gray-500">KI beantwortet neue Bewertungen automatisch</p>
                    </div>
                    <Switch
                      checked={autoReplyEnabled}
                      onCheckedChange={setAutoReplyEnabled}
                    />
                  </div>
                  
                  {autoReplyEnabled && (
                    <div className="p-4 bg-white rounded-xl space-y-3">
                      <div>
                        <Label className="text-gray-700">Mindestbewertung für Auto-Reply</Label>
                        <p className="text-sm text-gray-500 mb-2">
                          Nur Bewertungen mit dieser Sternzahl oder höher werden automatisch beantwortet
                        </p>
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              type="button"
                              onClick={() => setAutoReplyMinRating(rating)}
                              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                                autoReplyMinRating <= rating 
                                  ? 'bg-amber-100 text-amber-600' 
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              <Star className={`w-5 h-5 ${autoReplyMinRating <= rating ? 'fill-amber-500' : ''}`} />
                            </button>
                          ))}
                          <span className="ml-2 text-sm text-gray-600">
                            {autoReplyMinRating}+ Sterne
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Button onClick={handleSaveAutoReply} disabled={savingAutoReply} className="rounded-xl">
                    {savingAutoReply ? (
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

          {/* Stats Card (Placeholder) */}
          <Card className="p-6 rounded-2xl shadow-sm border-0 bg-gray-50/80">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bewertungs-Statistiken</h3>
            <p className="text-gray-500 text-sm">
              Hier werden bald deine Bewertungs-Statistiken angezeigt, z.B. wie viele Kunden nach dem Stempeln eine Bewertung abgegeben haben.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded-xl">
                <div className="text-2xl font-bold text-gray-900">-</div>
                <div className="text-xs text-gray-500 mt-1">Anfragen gesendet</div>
              </div>
              <div className="text-center p-4 bg-white rounded-xl">
                <div className="text-2xl font-bold text-gray-900">-</div>
                <div className="text-xs text-gray-500 mt-1">Bewertungen erhalten</div>
              </div>
              <div className="text-center p-4 bg-white rounded-xl">
                <div className="text-2xl font-bold text-gray-900">-%</div>
                <div className="text-xs text-gray-500 mt-1">Conversion Rate</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GoogleBewertungen;
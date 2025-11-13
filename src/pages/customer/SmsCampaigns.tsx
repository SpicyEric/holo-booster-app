import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, MessageSquare, Users, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Particles from "@/components/Particles";
import { CustomerHeader } from "@/components/CustomerHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";

interface Segment {
  type: 'all' | 'last_scanners' | 'min_scans' | 'exact_scans' | 'timerange';
  value?: number;
  from?: string;
  to?: string;
  timeField?: 'first_scan_at' | 'last_scan_at';
  limit?: number;
}

const PACKAGE_OPTIONS = [
  { tier: '100', price: 17.85, priceId: 'price_1SSwOiBhiBjCX9PmJhUwc6d8', max: 100 },
  { tier: '250', price: 44.63, priceId: 'price_1SSwRDBhiBjCX9PmvGQB0q4i', max: 250 },
  { tier: '500', price: 89.25, priceId: 'price_1SSwTQBhiBjCX9PmI1TGSTjN', max: 500 },
  { tier: '800', price: 142.80, priceId: 'price_1SSwVFBhiBjCX9Pm9Dfogl3x', max: 800 },
  { tier: '1200', price: 214.20, priceId: 'price_1SSwXJBhiBjCX9PmYm60UkTr', max: 1200 }
];

export default function SmsCampaigns() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  
  // Statistics
  const [versendbare, setVersendbare] = useState(0);
  const [historischeScans, setHistorischeScans] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Segment selection
  const [segmentType, setSegmentType] = useState<Segment['type']>('all');
  const [segmentValue, setSegmentValue] = useState<number>(10);
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [timeField, setTimeField] = useState<'first_scan_at' | 'last_scan_at'>('last_scan_at');
  const [useLimit, setUseLimit] = useState(false);
  const [customLimit, setCustomLimit] = useState(100);
  
  // Estimate
  const [estRecipients, setEstRecipients] = useState(0);
  const [recommendedTier, setRecommendedTier] = useState('100');
  const [estimating, setEstimating] = useState(false);
  
  // Message
  const [messageText, setMessageText] = useState('');
  const [addUnsubscribe, setAddUnsubscribe] = useState(false);
  
  // Package & Payment
  const [selectedPackage, setSelectedPackage] = useState('100');
  const [purchasing, setPurchasing] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  
  // Campaign status
  const [campaign, setCampaign] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);

  // Load statistics
  useEffect(() => {
    loadStatistics();
  }, []);

  // Check for payment success
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const campaignIdParam = searchParams.get('campaign_id');
    
    if (sessionId && campaignIdParam) {
      toast({
        title: "Zahlung erfolgreich!",
        description: "Ihre SMS-Kampagne wird jetzt vorbereitet und versendet.",
      });
      setCampaignId(campaignIdParam);
      setCurrentStep(4);
      loadCampaignStatus(campaignIdParam);
    }
    
    if (searchParams.get('canceled')) {
      toast({
        title: "Zahlung abgebrochen",
        description: "Die Zahlung wurde abgebrochen. Sie können es erneut versuchen.",
        variant: "destructive"
      });
    }
  }, [searchParams]);

  const loadStatistics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: customerUser } = await supabase
        .from('customer_users')
        .select('customer_id')
        .eq('user_id', user.id)
        .single();

      if (!customerUser) return;

      // Versendbare Nummern
      const { count: versendCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerUser.customer_id)
        .eq('opt_in', true)
        .is('deleted_at', null)
        .is('opted_out_at', null);

      setVersendbare(versendCount || 0);

      // Historische Scans
      const { count: scanCount } = await supabase
        .from('scans')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerUser.customer_id);

      setHistorischeScans(scanCount || 0);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildSegment = (): Segment => {
    const segment: Segment = { type: segmentType };
    
    if (segmentType === 'last_scanners' || segmentType === 'min_scans' || segmentType === 'exact_scans') {
      segment.value = segmentValue;
    }
    
    if (segmentType === 'timerange') {
      segment.from = timeFrom;
      segment.to = timeTo;
      segment.timeField = timeField;
    }
    
    if (useLimit) {
      segment.limit = customLimit;
    }
    
    return segment;
  };

  const handleEstimate = async () => {
    setEstimating(true);
    try {
      const { data, error } = await supabase.functions.invoke('estimate-campaign', {
        body: { segment: buildSegment() }
      });

      if (error) throw error;

      setEstRecipients(data.estRecipients);
      setRecommendedTier(data.recommendedTier);
      
      toast({
        title: "Schätzung erfolgreich",
        description: `Etwa ${data.estRecipients} Empfänger wurden gefunden.`,
      });
    } catch (error: any) {
      toast({
        title: "Fehler bei der Schätzung",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setEstimating(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!messageText.trim()) {
      toast({
        title: "Nachricht fehlt",
        description: "Bitte geben Sie eine Nachricht ein.",
        variant: "destructive"
      });
      return;
    }

    if (messageText.length > 612) {
      toast({
        title: "Nachricht zu lang",
        description: "Die Nachricht darf maximal 612 Zeichen lang sein.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-campaign', {
        body: {
          segment: buildSegment(),
          messageText: messageText.trim(),
          addUnsubscribe,
          packageTier: selectedPackage,
          estRecipients
        }
      });

      if (error) throw error;

      setCampaignId(data.campaign.id);
      setCurrentStep(3);
    } catch (error: any) {
      toast({
        title: "Fehler beim Erstellen",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleCheckout = async () => {
    if (!campaignId) return;
    
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-campaign-checkout', {
        body: { campaignId }
      });

      if (error) throw error;

      // Redirect to Stripe Checkout
      window.location.href = data.checkoutUrl;
    } catch (error: any) {
      toast({
        title: "Fehler beim Checkout",
        description: error.message,
        variant: "destructive"
      });
      setPurchasing(false);
    }
  };

  const loadCampaignStatus = async (id: string) => {
    setStatusLoading(true);
    try {
      const { data: campaignData } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

      setCampaign(campaignData);

      const { data: messagesData } = await supabase
        .from('campaign_messages')
        .select('*, contacts(phone)')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false });

      setMessages(messagesData || []);
    } catch (error) {
      console.error('Error loading campaign status:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  // Refresh campaign status
  useEffect(() => {
    if (campaignId && currentStep === 4) {
      loadCampaignStatus(campaignId);
      const interval = setInterval(() => loadCampaignStatus(campaignId), 5000);
      return () => clearInterval(interval);
    }
  }, [campaignId, currentStep]);

  const getCharCount = () => {
    let text = messageText;
    if (addUnsubscribe) text += '\n\nStop mit STOP.';
    return text.length;
  };

  const getSMSCount = () => {
    const charCount = getCharCount();
    if (charCount <= 160) return 1;
    if (charCount <= 306) return 2;
    if (charCount <= 459) return 3;
    return 4;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Particles 
        particleColors={['#8B5CF6', '#3B82F6', '#8B5CF6']}
        particleCount={100}
        particleSpread={8}
        speed={0.05}
        particleBaseSize={100}
        sizeRandomness={1.5}
        moveParticlesOnHover={true}
        alphaParticles={true}
        disableRotation={false}
        cameraDistance={20}
      />
      
      <CustomerHeader />

      <main className="container mx-auto px-4 py-8 space-y-6 relative z-10 max-w-5xl">
        <div>
          <h1 className="text-3xl font-bold">SMS-Kampagnen</h1>
          <p className="text-muted-foreground mt-2">
            Erreichen Sie Ihre Kunden direkt per SMS
          </p>
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Aktuell verwendbare Handynummern
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{versendbare}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5" />
                Historische Scans gesamt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{historischeScans}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Abweichungen entstehen, wenn Empfänger Daten gelöscht oder SMS-Empfang abgelehnt haben.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Step 1: Segment Selection */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Schritt 1: Empfänger auswählen</CardTitle>
              <CardDescription>
                Die Auswahl bezieht sich ausschließlich auf Ihre eigenen Empfänger. Andere Mandanten sind technisch ausgeschlossen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={segmentType} onValueChange={(v) => setSegmentType(v as Segment['type'])}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all">Alle aktuellen Empfänger</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="last_scanners" id="last_scanners" />
                  <Label htmlFor="last_scanners">Letzte N Scanner</Label>
                </div>
                {segmentType === 'last_scanners' && (
                  <Input
                    type="number"
                    value={segmentValue}
                    onChange={(e) => setSegmentValue(parseInt(e.target.value) || 0)}
                    placeholder="Anzahl"
                    className="ml-6 max-w-xs"
                  />
                )}
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="min_scans" id="min_scans" />
                  <Label htmlFor="min_scans">Mindestens X Scans</Label>
                </div>
                {segmentType === 'min_scans' && (
                  <Select value={segmentValue.toString()} onValueChange={(v) => setSegmentValue(parseInt(v))}>
                    <SelectTrigger className="ml-6 max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5, 10].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="exact_scans" id="exact_scans" />
                  <Label htmlFor="exact_scans" className="cursor-pointer">
                    Genau X Scans
                    <span className="text-xs text-muted-foreground ml-2">
                      (nur Empfänger, die exakt X Mal gescannt haben)
                    </span>
                  </Label>
                </div>
                {segmentType === 'exact_scans' && (
                  <Select value={segmentValue.toString()} onValueChange={(v) => setSegmentValue(parseInt(v))}>
                    <SelectTrigger className="ml-6 max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="timerange" id="timerange" />
                  <Label htmlFor="timerange">Zeitraum</Label>
                </div>
                {segmentType === 'timerange' && (
                  <div className="ml-6 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Von</Label>
                        <Input type="date" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} />
                      </div>
                      <div>
                        <Label>Bis</Label>
                        <Input type="date" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} />
                      </div>
                    </div>
                    <Select value={timeField} onValueChange={(v: any) => setTimeField(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="first_scan_at">Erster Scan</SelectItem>
                        <SelectItem value="last_scan_at">Letzter Scan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </RadioGroup>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="use-limit">Zufallsauswahl begrenzen</Label>
                  <Switch
                    id="use-limit"
                    checked={useLimit}
                    onCheckedChange={setUseLimit}
                  />
                </div>
                {useLimit && (
                  <>
                    <Input
                      type="number"
                      value={customLimit}
                      onChange={(e) => setCustomLimit(parseInt(e.target.value) || 0)}
                      placeholder="Max. Empfänger"
                      className="max-w-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Nur versenden an Zufallsauswahl von max. {customLimit} Empfängern (falls weniger als Schätzung)
                    </p>
                  </>
                )}
              </div>

              <Button onClick={handleEstimate} disabled={estimating} className="w-full">
                {estimating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Schätze...
                  </>
                ) : (
                  'Empfänger schätzen'
                )}
              </Button>

              {estRecipients > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Geschätzte Empfänger: <strong>{estRecipients}</strong><br />
                    Empfohlenes Paket: <strong>≤{recommendedTier}</strong>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => setCurrentStep(2)} 
                disabled={estRecipients === 0}
                className="w-full"
              >
                Weiter zur Nachricht
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 2: Message */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Schritt 2: Nachricht verfassen</CardTitle>
              <CardDescription>
                Schreiben Sie Ihre SMS-Nachricht (max. 120 Zeichen, nur Text, keine Emojis)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Textarea
                  value={messageText}
                  onChange={(e) => {
                    const text = e.target.value;
                    // Remove emojis and limit to 120 chars
                    const cleanText = text.replace(/[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}|\u{1F900}-\u{1F9FF}|\u{1F1E0}-\u{1F1FF}]/gu, '');
                    setMessageText(cleanText.slice(0, 120));
                  }}
                  placeholder="Ihre Nachricht (nur Text, keine Emojis)..."
                  rows={4}
                  maxLength={120}
                  className="resize-none"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>{messageText.length} / 120 Zeichen</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="add-unsub">Abbestell-Hinweis anhängen</Label>
                <Switch
                  id="add-unsub"
                  checked={addUnsubscribe}
                  onCheckedChange={setAddUnsubscribe}
                />
              </div>
              {addUnsubscribe && (
                <Alert>
                  <AlertDescription className="text-xs">
                    Folgender Text wird angehängt: "Stop mit STOP."
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Zurück
              </Button>
              <Button onClick={handleCreateCampaign} disabled={!messageText.trim()}>
                Weiter zur Zahlung
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 3: Package Selection & Payment */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Schritt 3: Paket wählen & buchen</CardTitle>
              <CardDescription>
                Wählen Sie ein SMS-Paket und schließen Sie die Zahlung ab
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {useLimit && customLimit < estRecipients && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Sie erreichen nur {customLimit} Empfänger. Die Auswahl erfolgt zufällig und fair.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {PACKAGE_OPTIONS.map((pkg) => {
                  const isRecommended = pkg.tier === recommendedTier;
                  const canSelect = estRecipients <= pkg.max || (useLimit && customLimit <= pkg.max);
                  
                  return (
                    <Card
                      key={pkg.tier}
                      className={`cursor-pointer transition-all ${
                        selectedPackage === pkg.tier
                          ? 'border-primary ring-2 ring-primary'
                          : canSelect
                          ? 'hover:border-primary/50'
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                      onClick={() => canSelect && setSelectedPackage(pkg.tier)}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">≤{pkg.tier}</CardTitle>
                        {isRecommended && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            Empfohlen
                          </span>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">€{pkg.price}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Bis zu {pkg.max} Empfänger
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {estRecipients > 0 && (
                <Alert>
                  <AlertDescription className="text-sm">
                    <strong>Hinweis:</strong> Wenn Sie bewusst ein kleineres Paket wählen als Ihre Empfänger-Schätzung, 
                    wird eine zufällige, faire Auswahl derselben Größe versendet.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                Zurück
              </Button>
              <Button onClick={handleCheckout} disabled={purchasing}>
                {purchasing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Weiterleitung...
                  </>
                ) : (
                  `Kostenpflichtig buchen & versenden (€${PACKAGE_OPTIONS.find(p => p.tier === selectedPackage)?.price})`
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 4: Status & Report */}
        {currentStep === 4 && campaign && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Kampagnen-Status</CardTitle>
                <CardDescription>
                  Verfolgen Sie den Versandstatus Ihrer SMS-Kampagne
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600">
                      {messages.filter(m => m.status === 'queued').length}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <Clock className="h-4 w-4" />
                      Wartend
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {messages.filter(m => m.status === 'sent').length}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      Gesendet
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {messages.filter(m => m.status === 'delivered').length}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Zugestellt
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">
                      {messages.filter(m => m.status === 'failed').length}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <XCircle className="h-4 w-4" />
                      Fehlgeschlagen
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Status: <strong className="capitalize">{campaign.status === 'paid' ? 'Bezahlt - Versand läuft' : campaign.status === 'sending' ? 'Versand läuft' : campaign.status === 'done' ? 'Abgeschlossen' : campaign.status}</strong>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Versanddetails</CardTitle>
              </CardHeader>
              <CardContent>
                {statusLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {messages.map((msg) => (
                      <div key={msg.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          {msg.status === 'queued' && <Clock className="h-4 w-4 text-yellow-600" />}
                          {msg.status === 'sent' && <MessageSquare className="h-4 w-4 text-blue-600" />}
                          {msg.status === 'delivered' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                          {msg.status === 'failed' && <XCircle className="h-4 w-4 text-red-600" />}
                          <span className="font-mono text-sm">
                            {msg.contacts?.phone ? `***${msg.contacts.phone.slice(-4)}` : 'Unbekannt'}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {msg.error_code && <span className="text-red-600">{msg.error_code}</span>}
                          {msg.sent_at && new Date(msg.sent_at).toLocaleTimeString('de-DE')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

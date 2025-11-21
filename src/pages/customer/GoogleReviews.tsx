import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Star, AlertCircle, CheckCircle2, Link as LinkIcon, Clock } from "lucide-react";
import Particles from "@/components/Particles";
import { CustomerHeader } from "@/components/CustomerHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface MockReview {
  id: string;
  googleId: string;
  stars: number;
  reviewerName: string;
  reviewText: string;
  date: string;
  selected: boolean;
}

const PRICE_PER_REVIEW = 19.45; // EUR brutto pro erfolgreich gelöschter Bewertung

export default function GoogleReviews() {
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [googleAccountLinked, setGoogleAccountLinked] = useState(false);
  const [businessName, setBusinessName] = useState("Ihr Unternehmen");
  const [reviews, setReviews] = useState<MockReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const REVIEWS_PER_PAGE = 10;

  useEffect(() => {
    loadCustomerData();
  }, [user]);

  useEffect(() => {
    // Check if returning from OAuth with code
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state'); // customer_id
    
    if (code && state && state === customerId) {
      handleOAuthCallback(code);
      // Clean URL
      window.history.replaceState({}, '', '/customer/google-reviews');
    }
  }, [customerId]);

  const loadCustomerData = async () => {
    if (!user) return;

    try {
      const { data: customerUser } = await supabase
        .from("customer_users")
        .select("customer_id")
        .eq("user_id", user.id)
        .single();

      if (!customerUser) return;

      setCustomerId(customerUser.customer_id);

      // Load customer details
      const { data: customer } = await supabase
        .from("customers")
        .select("company_name")
        .eq("id", customerUser.customer_id)
        .single();

      if (customer?.company_name) {
        setBusinessName(customer.company_name);
      }

      // TODO: Load existing orders once types are updated
      // const { data: ordersData } = await supabase
      //   .from("review_deletion_orders")
      //   .select("*")
      //   .eq("customer_id", customerUser.customer_id)
      //   .order("created_at", { ascending: false });
      // setOrders(ordersData || []);
    } catch (error) {
      console.error("Error loading customer data:", error);
    }
  };

  const handleOAuthCallback = async (code: string) => {
    if (!customerId) return;

    setLoading(true);
    try {
      toast.info("Google-Konto wird verknüpft...");

      const { data, error } = await supabase.functions.invoke(
        'google-oauth-callback',
        { 
          body: { 
            code,
            customer_id: customerId 
          } 
        }
      );

      if (error) throw error;

      setGoogleAccountLinked(true);
      setBusinessName(data.business_name || businessName);
      toast.success("Google-Konto erfolgreich verknüpft!");

      // Fetch reviews
      await fetchReviews();
    } catch (error: any) {
      console.error("Error in OAuth callback:", error);
      toast.error("Fehler beim Verknüpfen: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    if (!customerId) return;

    try {
      const { data: reviewsData, error: reviewsError } = await supabase.functions.invoke(
        'fetch-google-reviews',
        { body: { customer_id: customerId } }
      );

      if (reviewsError) {
        console.error("Error fetching reviews:", reviewsError);
        toast.error("Fehler beim Laden der Bewertungen");
        return;
      }
      
      if (reviewsData?.reviews) {
        const formattedReviews = reviewsData.reviews.map((review: any) => ({
          id: review.name,
          googleId: review.name,
          stars: review.starRating === "FIVE" ? 5 : 
                 review.starRating === "FOUR" ? 4 :
                 review.starRating === "THREE" ? 3 :
                 review.starRating === "TWO" ? 2 : 1,
          reviewerName: review.reviewer?.displayName || "Anonym",
          reviewText: review.comment || "",
          date: review.createTime || new Date().toISOString(),
          selected: false
        }));
        setReviews(formattedReviews);
        toast.success("Bewertungen geladen!");
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error("Fehler beim Laden der Bewertungen");
    }
  };

  const handleLinkGoogleAccount = async () => {
    if (!customerId) {
      toast.error("Kunde nicht gefunden");
      return;
    }

    setLoading(true);
    try {
      // Check if account is already linked
      const { data: customer } = await supabase
        .from("customers")
        .select("google_access_token, google_business_name")
        .eq("id", customerId)
        .single();

      if (customer?.google_access_token) {
        setGoogleAccountLinked(true);
        setBusinessName(customer.google_business_name || businessName);
        await fetchReviews();
        setLoading(false);
        return;
      }

      // Redirect to Google OAuth with new strategy: redirect to frontend
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) {
        toast.error("Google Client ID nicht konfiguriert");
        setLoading(false);
        return;
      }

      // NEW: Redirect to frontend app instead of edge function
      const redirectUri = `${window.location.origin}/customer/google-reviews`;
      const scope = 'https://www.googleapis.com/auth/business.manage';
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scope)}&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${customerId}`;
      
      window.location.href = authUrl;
    } catch (error: any) {
      console.error("Error linking Google account:", error);
      toast.error("Fehler beim Verknüpfen des Google-Kontos");
      setLoading(false);
    }
  };

  const loadMockReviews = () => {
    setLoading(true);
    // Mock reviews with 1-3 stars only
    const mockReviews: MockReview[] = [
      {
        id: "1",
        googleId: "review_123456",
        stars: 1,
        reviewerName: "Max Mustermann",
        reviewText: "Sehr unzufrieden mit dem Service. Lange Wartezeiten und unfreundliches Personal.",
        date: "2024-03-15",
        selected: false
      },
      {
        id: "2",
        googleId: "review_123457",
        stars: 2,
        reviewerName: "Anna Schmidt",
        reviewText: "Durchschnittliche Qualität, Preis-Leistung stimmt nicht.",
        date: "2024-03-10",
        selected: false
      },
      {
        id: "3",
        googleId: "review_123458",
        stars: 3,
        reviewerName: "Thomas Weber",
        reviewText: "Okay, aber nichts Besonderes.",
        date: "2024-03-05",
        selected: false
      },
      {
        id: "4",
        googleId: "review_123459",
        stars: 1,
        reviewerName: "Lisa Müller",
        reviewText: "Katastrophale Erfahrung. Nicht zu empfehlen!",
        date: "2024-02-28",
        selected: false
      }
    ];
    
    setTimeout(() => {
      setReviews(mockReviews);
      setLoading(false);
    }, 1000);
  };

  const toggleReviewSelection = (reviewId: string) => {
    setReviews(reviews.map(r => 
      r.id === reviewId ? { ...r, selected: !r.selected } : r
    ));
  };

  // Filter and paginate reviews
  const filteredReviews = starFilter 
    ? reviews.filter(r => r.stars === starFilter)
    : reviews;
  
  const totalPages = Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE);
  const startIndex = (currentPage - 1) * REVIEWS_PER_PAGE;
  const paginatedReviews = filteredReviews.slice(startIndex, startIndex + REVIEWS_PER_PAGE);
  
  const selectedCount = reviews.filter(r => r.selected).length;
  const maxCost = selectedCount * PRICE_PER_REVIEW;

  const handleSubmitOrder = async () => {
    // TODO: Implement once types are updated
    toast.info("Diese Funktion wird nach dem nächsten Build verfügbar sein");
    return;
    
    // if (!customerId || selectedReviews.length === 0) {
    //   toast.error("Bitte wählen Sie mindestens eine Bewertung aus");
    //   return;
    // }
    //
    // setSubmitting(true);
    // try {
    //   // Create order
    //   const { data: order, error: orderError } = await supabase
    //     .from("review_deletion_orders")
    //     .insert({
    //       customer_id: customerId,
    //       created_by_user_id: user?.id,
    //       google_account_linked: googleAccountLinked,
    //       google_business_name: businessName,
    //       total_reviews_selected: selectedReviews.length,
    //       max_cost_cents: Math.round(selectedReviews.length * PRICE_PER_REVIEW * 100),
    //       reviews_data: selectedReviews,
    //       status: "eingereicht"
    //     })
    //     .select()
    //     .single();
    //
    //   if (orderError) throw orderError;
    //
    //   // Insert individual results for tracking
    //   const results = selectedReviews.map(review => ({
    //     order_id: order.id,
    //     review_google_id: review.googleId,
    //     review_stars: review.stars,
    //     review_text: review.reviewText,
    //     reviewer_name: review.reviewerName,
    //     review_date: review.date
    //   }));
    //
    //   const { error: resultsError } = await supabase
    //     .from("review_deletion_results")
    //     .insert(results);
    //
    //   if (resultsError) throw resultsError;
    //
    //   toast.success("Auftrag erfolgreich eingereicht!");
    //   
    //   // Reload orders
    //   await loadCustomerData();
    //   
    //   // Reset selection
    //   setReviews(reviews.map(r => ({ ...r, selected: false })));
    // } catch (error: any) {
    //   console.error("Error submitting order:", error);
    //   toast.error("Fehler beim Einreichen des Auftrags");
    // } finally {
    //   setSubmitting(false);
    // }
  };

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

      <main className="container mx-auto px-4 py-8 space-y-6 relative z-10 max-w-6xl">
        <h1 className="text-3xl font-bold">Die Löschung von Fake Google-Bewertungen</h1>

        {/* Informations-Sektion */}
        <Card>
          <CardHeader>
            <CardTitle>Für welche Bewertungen gilt dies?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Dies betrifft alle Bewertungen, bei denen Sie nicht sicher wissen, ob der Bewerter eine eigene Erfahrung mit Ihrem Unternehmen gemacht hat. Aufgrund der Anonymität der Bewertungen dürfte eine sichere Zuordnung fast nie möglich sein.
            </p>

            <div className="space-y-3 pt-4">
              <div>
                <h3 className="font-semibold mb-2">Ablauf:</h3>
                <p className="text-sm text-muted-foreground">
                  Wir kontaktieren Google und weisen darauf hin, dass bei den betroffenen Bewertungen unklar ist, ob überhaupt ein Geschäftskontakt/eine eigene Erfahrung des Bewerters bestand. Unsere Dienstleistung beschränkt sich ausschließlich auf diesen konkreten Vorgang!
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Erfolgschancen:</h3>
                <p className="text-sm text-muted-foreground">
                  Die durchschnittliche Löschquote liegt bei ca. 90%.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Bezahlung:</h3>
                <p className="text-sm text-muted-foreground">
                  Nach Abschluss des Vorgangs erhalten Sie eine Übersicht der gelöschten Bewertungen. Zudem bezahlen Sie nur für erfolgreich gelöschte Bewertungen.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Bearbeitungszeit:</h3>
                <p className="text-sm text-muted-foreground">
                  Nach Auftragseingang dauert es typischerweise 14 Tage, bis Sie Ihr Ergebnis zurückbekommen.
                </p>
              </div>

              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Hinweis:</strong> Wir prüfen nicht den Inhalt einer Bewertung und bieten keine Rechtsdienstleistung/Rechtsberatung an. Die Dienstleistung beschränkt sich auf den oben beschriebenen Vorgang.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* Wichtiger Hinweis vor der Auftragserstellung */}
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            <strong>Achtung:</strong> Bewertungen, die von Ihrem Google-Profil aus beantwortet wurden, werden von Google pauschal nicht gelöscht. Sie können daher nur Bewertungen beauftragen, die vom Inhaber des Google-Profils nicht beantwortet sind. Stellen Sie sicher, dass Sie die Antworten unter den Bewertungen entfernt haben, bevor Sie den Auftrag einreichen.
          </AlertDescription>
        </Alert>

        {/* Google-Konto Verknüpfung */}
        {!googleAccountLinked ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Google-Konto verknüpfen
              </CardTitle>
              <CardDescription>
                Verknüpfe dein Google-Unternehmensprofil, um deine 1–3 Sterne Bewertungen direkt hier auszuwählen und zur Löschung einzureichen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleLinkGoogleAccount} className="w-full sm:w-auto">
                <LinkIcon className="mr-2 h-4 w-4" />
                Google-Konto verknüpfen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Verknüpfungsstatus */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Google-Konto verknüpft</span>
                  <span className="text-muted-foreground">({businessName})</span>
                </div>
              </CardContent>
            </Card>

            {/* Bewertungs-Auswahl */}
            <Card>
              <CardHeader>
                <CardTitle>Wähle die Google-Bewertungen aus, die du löschen lassen möchtest</CardTitle>
                <CardDescription>
                  Es werden nur Bewertungen mit 1–3 Sternen angezeigt, da 4–5 Sterne Bewertungen von Google pauschal nicht zur Überprüfung akzeptiert werden.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filter */}
                {reviews.length > 0 && (
                  <div className="flex gap-2 mb-4">
                    <Button
                      variant={starFilter === null ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setStarFilter(null);
                        setCurrentPage(1);
                      }}
                    >
                      Alle
                    </Button>
                    {[1, 2, 3].map((stars) => (
                      <Button
                        key={stars}
                        variant={starFilter === stars ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setStarFilter(stars);
                          setCurrentPage(1);
                        }}
                      >
                        {stars} {stars === 1 ? 'Stern' : 'Sterne'}
                      </Button>
                    ))}
                  </div>
                )}
                
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : reviews.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Keine 1–3 Sterne Bewertungen gefunden.
                  </p>
                ) : (
                  <>
                    <div className="space-y-4">
                      {paginatedReviews.map((review) => (
                      <div 
                        key={review.id} 
                        className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <Checkbox
                          checked={review.selected}
                          onCheckedChange={() => toggleReviewSelection(review.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.stars
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "fill-gray-200 text-gray-200"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium">{review.reviewerName}</span>
                            <span className="text-xs text-muted-foreground">{review.date}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{review.reviewText}</p>
                        </div>
                      </div>
                      ))}
                    </div>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Zurück
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Seite {currentPage} von {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Weiter
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Auswahl und Kosten */}
            {reviews.length > 0 && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Ausgewählte Bewertungen:</span>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {selectedCount}
                    </Badge>
                  </div>

                  {selectedCount > 0 && (
                    <Alert>
                      <AlertDescription className="space-y-2">
                        <div className="font-semibold text-lg">
                          Maximal mögliche Kosten: {maxCost.toFixed(2)} € netto
                        </div>
                        <p className="text-sm">
                          <strong>Abrechnung 100% erfolgsbasiert:</strong> Du zahlst nur für Bewertungen, die tatsächlich gelöscht werden. Sollte z.B. nur 2 von 3 Bewertungen erfolgreich gelöscht werden, zahlst du auch nur diese 2.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Preis pro erfolgreich gelöschter Bewertung: {PRICE_PER_REVIEW.toFixed(2)} € brutto
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={handleSubmitOrder}
                    disabled={selectedCount === 0 || submitting}
                    className="w-full"
                    size="lg"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Wird eingereicht...
                      </>
                    ) : (
                      `Löschauftrag für ${selectedCount} Bewertung${selectedCount !== 1 ? 'en' : ''} stellen`
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Meine Löschaufträge & Reportings */}
        {orders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Meine Löschaufträge & Reportings</CardTitle>
              <CardDescription>
                Hier finden Sie alle Ihre eingereichten Aufträge und die Ergebnisse der Löschungen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                      <Badge variant={
                        order.status === 'abgeschlossen' ? 'default' :
                        order.status === 'in_bearbeitung' ? 'secondary' :
                        order.status === 'storniert' ? 'destructive' :
                        'outline'
                      }>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Bewertungen:</span>
                        <span className="ml-2 font-medium">{order.total_reviews_selected}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Max. Kosten:</span>
                        <span className="ml-2 font-medium">{(order.max_cost_cents / 100).toFixed(2)} €</span>
                      </div>
                    </div>
                    {order.status === 'abgeschlossen' && order.actual_cost_cents && (
                      <div className="pt-2 border-t">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Tatsächliche Kosten:</span>
                          <span className="ml-2 font-medium text-green-600">
                            {(order.actual_cost_cents / 100).toFixed(2)} €
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* FAQ Sektion */}
        <Card>
          <CardHeader>
            <CardTitle>Häufige Fragen</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Wird der Bewerter kontaktiert?</AccordionTrigger>
                <AccordionContent>
                  Der Bewerter wird nicht direkt kontaktiert. Die Bewertungen werden bei Google – mit dem Ziel die Echtheit der Bewertung überprüfen zu lassen – gemeldet. Google entscheidet dann in eigenem Ermessen, ob sie den Bewerter kontaktieren oder nicht.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>Wie wahrscheinlich ist eine Löschung?</AccordionTrigger>
                <AccordionContent>
                  Die durchschnittliche Löschquote liegt bei 90%. Demnach liegen die Chancen einer Löschung grundsätzlich sehr gut.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>Wie ist der Ablauf?</AccordionTrigger>
                <AccordionContent>
                  Google wird kontaktiert und darum gebeten die Echtheit der Bewertung/en zu überprüfen. Unsere Dienstleistung beschränkt sich ausschließlich auf diesen konkreten Vorgang. Google entscheidet dann, ob die Bewertungen in Ordnung sind oder nicht. Dieser Vorgang dauert ca. 2 Wochen. Anschließend erhalten wir eine Rückmeldung von Google, welche Bewertungen gelöscht wurden. Erfahrungsgemäß werden ca. 90 Prozent gelöscht, da sie FAKE sind.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>Welche Bewertungen können gelöscht werden?</AccordionTrigger>
                <AccordionContent>
                  Grundsätzlich können alle Bewertungen zwischen 1 und 3 Sterne – mit dem Ziel die Echtheit einer Bewertung zu überprüfen – gemeldet werden. Die Löschung von 4 und 5 Sterne Bewertungen wird von Google pauschal abgelehnt.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger>Warum ist eine Bewertung nicht gelöscht worden?</AccordionTrigger>
                <AccordionContent>
                  Google entscheidet in eigenem Ermessen, ob eine Bewertung gelöscht wird oder nicht. Unser Vorgang beschränkt sich darauf die Echtheit einer Bewertung überprüfen zu lassen. Google teilt sodann mit, ob eine Bewertung gelöscht wurde oder nicht. Darüberhinaus können Sie rechtlich gegen eine Bewertung vorgehen. Hierzu müssen Sie einen Anwalt konsultieren.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger>Was passiert, wenn der Bewerter nach Löschung erneut bewertet?</AccordionTrigger>
                <AccordionContent>
                  Erfahrungsgemäß kommt es lediglich in Ausnahmefällen (unter 1% der Fälle), nach erfolgreicher Löschung, zur erneuten Bewertung desselben Verfassers.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Mail, LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_MS = 45_000;

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");

  const [autoLoginState, setAutoLoginState] = useState<
    "idle" | "running" | "success" | "failed"
  >("idle");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      let pendingEmail: string | null = null;
      try {
        pendingEmail = localStorage.getItem("pendingImpersonateEmail");
      } catch {
        pendingEmail = null;
      }
      if (!pendingEmail) return;

      // Need a logged-in admin/partner to call the impersonate function.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        try {
          localStorage.removeItem("pendingImpersonateEmail");
          localStorage.removeItem("pendingImpersonateAt");
        } catch {
          /* ignore */
        }
        return;
      }

      setAutoLoginState("running");

      const startedAt = Date.now();
      let tokenHash: string | null = null;

      while (!cancelled && Date.now() - startedAt < POLL_MAX_MS) {
        try {
          const { data, error } = await supabase.functions.invoke(
            "impersonateCustomer",
            { body: { email: pendingEmail } }
          );
          if (!error && data?.token_hash) {
            tokenHash = data.token_hash;
            break;
          }
        } catch {
          /* retry */
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }

      if (cancelled) return;

      if (!tokenHash) {
        setAutoLoginState("failed");
        return;
      }

      // Sign out the current admin/partner session, then exchange token_hash.
      await supabase.auth.signOut();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "magiclink",
      });

      if (verifyError) {
        console.error("[CHECKOUT-SUCCESS] verifyOtp error:", verifyError);
        setAutoLoginState("failed");
        return;
      }

      try {
        localStorage.removeItem("pendingImpersonateEmail");
        localStorage.removeItem("pendingImpersonateAt");
      } catch {
        /* ignore */
      }

      setAutoLoginState("success");
      toast.success("Du bist jetzt im neuen Kunden-Account angemeldet.");
      navigate("/kunde/mein-geschaeft", { replace: true });
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Vielen Dank!</h1>
              <p className="text-muted-foreground">
                Die Bestellung wurde erfolgreich abgeschlossen.
              </p>
            </div>

            {autoLoginState === "running" && (
              <div className="flex items-center justify-center gap-2 text-sm text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Account wird vorbereitet – du wirst gleich automatisch
                eingeloggt …
              </div>
            )}

            {autoLoginState === "failed" && (
              <p className="text-sm text-amber-600">
                Auto-Login hat nicht geklappt. Der Kunde erhält die
                Zugangs-E-Mail wie gewohnt – du kannst dich gleich manuell
                anmelden.
              </p>
            )}

            <Card className="bg-muted/50 border-primary/20">
              <CardContent className="pt-6 space-y-4 text-left">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold mb-1">
                      Zugang per E-Mail an den Kunden
                    </p>
                    <p className="text-muted-foreground">
                      Der Kunde erhält in Kürze eine E-Mail mit einem Link zum
                      Festlegen seines Passworts. Bis dahin kannst du den
                      Account hier direkt einrichten (Box-ID, Karten-System
                      usw.).
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {autoLoginState !== "success" && (
              <Button asChild className="w-full" size="lg" variant="outline">
                <Link to="/auth">
                  <LogIn className="mr-2 h-4 w-4" />
                  Zum Login
                </Link>
              </Button>
            )}

            {sessionId && (
              <p className="text-xs text-muted-foreground">
                Session ID: {sessionId.slice(0, 20)}…
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

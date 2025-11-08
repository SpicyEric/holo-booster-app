import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, Mail, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
            </div>

            {/* Heading */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Vielen Dank!</h1>
              <p className="text-muted-foreground">
                Ihre Bestellung wurde erfolgreich abgeschlossen.
              </p>
            </div>

            {/* Info Box */}
            <Card className="bg-muted/50 border-primary/20">
              <CardContent className="pt-6 space-y-4 text-left">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold mb-1">Zugang per E-Mail</p>
                    <p className="text-muted-foreground">
                      Sie erhalten in Kürze eine E-Mail mit Ihren Zugangsdaten und einem Link zum Festlegen Ihres Passworts.
                    </p>
                  </div>
                </div>

                <div className="bg-background/50 p-3 rounded-lg">
                  <h3 className="font-semibold text-sm mb-2">Nächste Schritte:</h3>
                  <ol className="text-sm space-y-1.5 list-decimal list-inside text-muted-foreground">
                    <li>Prüfen Sie Ihr E-Mail-Postfach</li>
                    <li>Klicken Sie auf den Passwort-Link</li>
                    <li>Legen Sie Ihr Passwort fest</li>
                    <li>Melden Sie sich in Ihrem Dashboard an</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* CTA Button */}
            <Button asChild className="w-full" size="lg">
              <Link to="/auth">
                <LogIn className="mr-2 h-4 w-4" />
                Zum Login
              </Link>
            </Button>

            {/* Session ID (for debugging) */}
            {sessionId && (
              <p className="text-xs text-muted-foreground">
                Session ID: {sessionId.slice(0, 20)}...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

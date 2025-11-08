import { Link } from "react-router-dom";
import { XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CheckoutCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            {/* Cancel Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center">
                <XCircle className="h-10 w-10 text-amber-600 dark:text-amber-400" />
              </div>
            </div>

            {/* Heading */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Zahlung abgebrochen</h1>
              <p className="text-muted-foreground">
                Sie haben die Zahlung abgebrochen. Keine Sorge, es wurde nichts berechnet.
              </p>
            </div>

            {/* Info Box */}
            <Card className="bg-muted/50 border-border">
              <CardContent className="pt-6 text-left text-sm">
                <p className="text-muted-foreground">
                  Falls Sie Fragen haben oder Hilfe benötigen, können Sie uns jederzeit kontaktieren.
                </p>
              </CardContent>
            </Card>

            {/* CTA Buttons */}
            <div className="space-y-2">
              <Button asChild className="w-full" size="lg">
                <Link to="/admin/checkout">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Zurück zum Checkout
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/">Zur Startseite</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

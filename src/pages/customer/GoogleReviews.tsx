import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Star, AlertCircle } from "lucide-react";
import Particles from "@/components/Particles";
import qraitLogo from '@/assets/qrait-logo-full.png';

export default function GoogleReviews() {
  const navigate = useNavigate();

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
      
      <header className="border-b relative z-10 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/customer')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={qraitLogo} alt="QRait Logo" className="h-10 w-auto" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6 relative z-10 max-w-4xl">
        <h1 className="text-3xl font-bold">Google-Bewertungen löschen lassen</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Service zur Löschung negativer Bewertungen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">Kommende Funktion</p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Wir arbeiten daran, Ihnen einen umfassenden Service zur rechtlichen Prüfung und Löschung unberechtigter Google-Bewertungen anzubieten.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Geplante Features:</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Rechtliche Prüfung von Bewertungen</li>
                <li>Unterstützung bei der Kontaktaufnahme mit Google</li>
                <li>Dokumentation und Nachverfolgung</li>
                <li>Beratung zu präventiven Maßnahmen</li>
              </ul>
            </div>

            <p className="text-sm text-muted-foreground pt-4">
              Bei dringenden Fällen können Sie sich bereits jetzt an unseren Support wenden.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
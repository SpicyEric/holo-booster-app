import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MessageSquare } from "lucide-react";
import Particles from "@/components/Particles";
import qraitLogo from '@/assets/qrait-logo-full.png';

export default function SmsCampaigns() {
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
        <h1 className="text-3xl font-bold">SMS-Kampagnen</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Kommende Funktion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Die SMS-Kampagnen-Funktion wird in Kürze verfügbar sein. Hier können Sie dann personalisierte SMS-Kampagnen an Ihre hinterlegten Kontakte versenden.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
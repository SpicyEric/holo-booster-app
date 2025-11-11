import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import Particles from "@/components/Particles";
import { CustomerHeader } from "@/components/CustomerHeader";

export default function SmsCampaigns() {
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
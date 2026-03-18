import { CheckCircle2, Image, Award, ArrowRight } from "lucide-react";

export default function WizardStepComplete() {
  return (
    <div className="space-y-6 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-10 h-10 text-primary" />
      </div>

      <div>
        <h3 className="text-2xl font-bold text-foreground">
          Dein Bonussystem ist eingerichtet! 🎉
        </h3>
        <p className="text-base text-muted-foreground mt-2 max-w-md mx-auto">
          Kümmere dich jetzt am besten noch um dein Erscheinungsbild im
          eloyo-Netzwerk.
        </p>
      </div>

      {/* Visual tips */}
      <div className="space-y-3 text-left">
        <div className="flex items-start gap-3 bg-card border border-border rounded-xl p-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Image className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-base font-medium text-foreground">
              Titelbild & Logo hochladen
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Ein ansprechendes Profilbild und ein Logo machen dein Geschäft
              erkennbar und professionell.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-card border border-border rounded-xl p-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Award className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-base font-medium text-foreground">
              Mindestens 10 Prämien anlegen
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Damit deine Kunden das Gefühl haben, mit ihren Punkten spielen
              zu können – z.B. sparen oder direkt einlösen.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 border border-border">
        <p className="text-xs text-muted-foreground">
          Im nächsten Schritt kannst du Adresse, Beschreibung und weitere
          Details ergänzen.
        </p>
      </div>
    </div>
  );
}

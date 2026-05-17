import { MainLayout } from '@/app/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Rocket, Gift, Star, ListChecks } from 'lucide-react';

export default function AppHowItWorks() {
  return (
    <MainLayout title="So funktioniert's" showBack>
      <div className="space-y-4">
        {/* Was ist ein Boost? */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-bold text-lg text-foreground">Was ist ein Boost?</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Boosts sind kostenlose Check-ins, die du dafür bekommst, Freunde
            einzuladen. Du kannst außerdem einen Boost bekommen, wenn du selbst
            eine Einladung annimmst, das Geschäft besuchst und dort erfolgreich
            eincheckst.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Pro Geschäft eskaliert deine Belohnung:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1.5 pl-1">
            <li className="flex gap-2">
              <span className="text-primary font-semibold">1.</span>
              <span>Erste erfolgreiche Empfehlung: <span className="font-semibold text-foreground">+1 Boost</span></span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-semibold">2.</span>
              <span>Zweite erfolgreiche Empfehlung: <span className="font-semibold text-foreground">+2 Boosts</span></span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-semibold">3.</span>
              <span>Dritte erfolgreiche Empfehlung: <span className="font-semibold text-foreground">+3 Boosts</span></span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-semibold">∞</span>
              <span>Für jede weitere erfolgreiche Empfehlung bekommst du dauerhaft <span className="font-semibold text-foreground">+3 Boosts</span> – pro Geschäft.</span>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground/80 leading-relaxed">
            Jeder Boost ist ein zusätzlicher Fortschritt auf dem Treuepass des
            Geschäfts, zu dem du jemanden eingeladen hast.
          </p>
        </Card>

        {/* Wie löse ich Prämien ein? */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-bold text-lg text-foreground">Wie löse ich Prämien ein?</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Die <span className="font-semibold text-foreground">erste Prämie eines Treuepasses</span> löst sich
            beim allerersten Check-in automatisch ein – du musst nichts dafür tun.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Für jede weitere Prämie, die du innerhalb eines Treuepasses
            freischaltest, musst du die Prämie zur Einlösung selbst aktivieren.
            Tippe dafür einfach auf die Prämie und dann auf <span className="font-semibold text-foreground">Aktivieren</span>.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Du kannst eine Prämie auch <span className="font-semibold text-foreground">schon vor dem Freischalten aktivieren</span> –
            nämlich genau dann, wenn dein nächster Check-in sie freischalten würde.
            Beim nächsten Check-in im Geschäft wird sie dann automatisch mit eingelöst.
          </p>
        </Card>

        {/* Bewertungsboost */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Star className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-bold text-lg text-foreground">Bewertungsboost</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Wenn du ein Geschäft erfolgreich auf Google bewertest, bekommst du
            einen kostenlosen Check-in als Bewertungs-Boost.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Bitte bewerte ehrlich – das hilft dem Geschäft enorm weiter und ist
            der ganze Sinn dahinter.
          </p>
        </Card>

        {/* Verlauf pro Pass */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ListChecks className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-bold text-lg text-foreground">Dein Verlauf pro Pass</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Auf jedem Treuepass siehst du rechts oben deine aktuelle
            Check-in-Zahl. Tippe darauf, um deinen vollständigen Verlauf bei
            diesem Geschäft im Detail zu sehen – inkl. aller Check-ins, Boosts,
            Bewertungs-Boni und eingelöster Prämien.
          </p>
        </Card>
      </div>
    </MainLayout>
  );
}

export { AppHowItWorks };

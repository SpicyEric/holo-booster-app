import { Card } from "@/components/ui/card";
import { BarChart3, Sparkles } from "lucide-react";

export default function SalesRepStats() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Statistiken</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Detaillierte Auswertungen zu deinen Abschlüssen und Provisionen
        </p>
      </div>

      <Card className="p-12 text-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200/50 dark:border-purple-900/30">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-5 shadow-lg">
          <BarChart3 className="h-8 w-8 text-white" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 dark:bg-white/10 border border-purple-200/60 dark:border-purple-800/40 text-xs font-medium text-purple-700 dark:text-purple-300 mb-4">
          <Sparkles className="h-3 w-3" />
          In Entwicklung
        </div>
        <h2 className="text-xl font-semibold mb-2">
          Statistiken werden noch ausgebaut
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Diese Seite ist aktuell noch nicht bereit. Wir arbeiten daran, dir
          hier bald aussagekräftige Auswertungen zu deinen Abschlüssen,
          Provisionen und Aktivitäten zur Verfügung zu stellen.
        </p>
      </Card>
    </div>
  );
}

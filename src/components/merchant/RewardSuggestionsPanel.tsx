import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Gift, Sparkles, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { INDUSTRY_REWARDS, INDUSTRY_LABELS, type ExampleReward } from './rewardSuggestionsData';

interface Props {
  merchantIndustry: string | null;
  avgOrderValue: number;
  avgPointsPerVisit?: number;
  stampPoints?: { green: number | null; blue: number | null; red: number | null };
  onSelectReward: (title: string, pointsRequired: number) => void;
}

/**
 * Calculates recommended points for a reward based on merchant's individual setup.
 * Rounds to clean 50-step values (50, 100, 150, 200, …).
 */
function getTargetVisits(category: 'small' | 'medium' | 'large'): number {
  switch (category) {
    case 'small': return 6;
    case 'medium': return 10;
    case 'large': return 15;
  }
}

function getRewardValueBonus(category: 'small' | 'medium' | 'large', estimatedValue: number): number {
  if (category === 'small') {
    if (estimatedValue <= 2) return 0;
    if (estimatedValue <= 4) return 25;
    return 50;
  }
  if (category === 'medium') {
    if (estimatedValue <= 7) return 0;
    if (estimatedValue <= 10) return 50;
    return 100;
  }
  // large
  if (estimatedValue <= 12) return 0;
  if (estimatedValue <= 18) return 50;
  if (estimatedValue <= 25) return 100;
  return 150;
}

function calculateRewardPoints(category: 'small' | 'medium' | 'large', estimatedValue: number, avgPointsPerVisit: number): number {
  if (avgPointsPerVisit <= 0) avgPointsPerVisit = 10;

  const targetVisits = getTargetVisits(category);
  const bonus = getRewardValueBonus(category, estimatedValue);
  const raw = (avgPointsPerVisit * targetVisits) + bonus;

  // Round to nearest 25 (50/75/100/125/…)
  return Math.max(50, Math.round(raw / 25) * 25);
}

const CATEGORY_META = {
  small: { label: 'Klein', visits: '~5–7 Besuche' },
  medium: { label: 'Mittel', visits: '~8–12 Besuche' },
  large: { label: 'Groß', visits: '~12–18 Besuche' },
};

export default function RewardSuggestionsPanel({ merchantIndustry, avgOrderValue, avgPointsPerVisit = 10, stampPoints, onSelectReward }: Props) {
  const defaultIndustry = merchantIndustry || 'sonstiges';
  const [selectedIndustry, setSelectedIndustry] = useState(defaultIndustry);

  const isOwnIndustry = selectedIndustry === defaultIndustry;

  const rewards = useMemo(() => INDUSTRY_REWARDS[selectedIndustry] || INDUSTRY_REWARDS.sonstiges, [selectedIndustry]);
  const grouped = useMemo(() => ({
    small: rewards.filter(r => r.category === 'small'),
    medium: rewards.filter(r => r.category === 'medium'),
    large: rewards.filter(r => r.category === 'large'),
  }), [rewards]);

  const avg = avgOrderValue || 10;

  const handleAdopt = (reward: ExampleReward) => {
    const pts = calculateRewardPoints(reward.category, reward.estimated_value, avgPointsPerVisit);
    onSelectReward(reward.title, pts);
    if (!isOwnIndustry) {
      toast.success('Punkte wurden automatisch für dein Geschäft berechnet.', {
        description: `Empfohlen: ${pts} Punkte`,
        duration: 4000,
      });
    }
  };

  return (
    <Card className="rounded-2xl shadow-sm border border-border h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg font-semibold">Beispielprämien</CardTitle>
            <CardDescription>Basierend auf deinem Stempelsystem</CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Branche:</span>
          <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
            <SelectTrigger className="rounded-xl w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(INDUSTRY_LABELS).map(([val, lbl]) => (
                <SelectItem key={val} value={val}>
                  {lbl}{val === defaultIndustry ? ' (deine)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Stamp overview */}
        {stampPoints && (stampPoints.green || stampPoints.blue || stampPoints.red) && (
          <div className="flex items-center gap-3 pt-2 px-1">
            {stampPoints.green != null && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs text-muted-foreground">{stampPoints.green} Pkt.</span>
              </div>
            )}
            {stampPoints.blue != null && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                <span className="text-xs text-muted-foreground">{stampPoints.blue} Pkt.</span>
              </div>
            )}
            {stampPoints.red != null && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                <span className="text-xs text-muted-foreground">{stampPoints.red} Pkt.</span>
              </div>
            )}
            <span className="text-xs text-muted-foreground/60 ml-auto">Ø {avgPointsPerVisit} Pkt./Besuch</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-5 overflow-y-auto max-h-[60vh]">
        {/* Hint for foreign industries */}
        {!isOwnIndustry && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 border border-border/50">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Punkte werden für dein Geschäft individuell berechnet, sobald du eine Prämie übernimmst.
            </p>
          </div>
        )}

        {(['small', 'medium', 'large'] as const).map(cat => {
          const meta = CATEGORY_META[cat];
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-foreground text-sm">{meta.label}</h3>
                <Badge variant="outline" className="rounded-full text-xs font-normal">{meta.visits}</Badge>
              </div>
              <div className="space-y-2">
                {grouped[cat].map((reward, i) => {
                  const pts = isOwnIndustry
                    ? calculateRewardPoints(reward.category, reward.estimated_value, avgPointsPerVisit)
                    : null;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-card rounded-xl border border-border/30 group hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Gift className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{reward.title}</p>
                          {pts !== null ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="secondary" className="rounded-full text-xs mt-0.5 cursor-help">
                                    empfohlen: {pts} Punkte
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-[220px]">
                                  <p className="text-xs">Basierend auf deinem Durchschnittsumsatz und Stempelsystem berechnet.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-xs text-muted-foreground mt-0.5 inline-block">
                              {CATEGORY_META[reward.category].label}e Prämie
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-lg opacity-50 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={() => handleAdopt(reward)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

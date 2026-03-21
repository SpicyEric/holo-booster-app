import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Gift, Sparkles } from 'lucide-react';
import { INDUSTRY_REWARDS, INDUSTRY_LABELS, type ExampleReward } from './rewardSuggestionsData';

interface Props {
  merchantIndustry: string | null;
  onSelectReward: (title: string) => void;
}

const CATEGORY_META = {
  small: { label: 'Klein', visits: '~5–7 Besuche' },
  medium: { label: 'Mittel', visits: '~8–12 Besuche' },
  large: { label: 'Groß', visits: '~12–18 Besuche' },
};

export default function RewardSuggestionsPanel({ merchantIndustry, onSelectReward }: Props) {
  const defaultIndustry = merchantIndustry || 'sonstiges';
  const [selectedIndustry, setSelectedIndustry] = useState(defaultIndustry);

  const rewards = useMemo(() => INDUSTRY_REWARDS[selectedIndustry] || INDUSTRY_REWARDS.sonstiges, [selectedIndustry]);
  const grouped = useMemo(() => ({
    small: rewards.filter(r => r.category === 'small'),
    medium: rewards.filter(r => r.category === 'medium'),
    large: rewards.filter(r => r.category === 'large'),
  }), [rewards]);

  return (
    <Card className="rounded-2xl shadow-sm border border-primary/15 bg-primary/5 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg font-semibold">Beispielprämien</CardTitle>
            <CardDescription>Lass dich inspirieren</CardDescription>
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
      </CardHeader>

      <CardContent className="space-y-5 overflow-y-auto max-h-[60vh]">
        {(['small', 'medium', 'large'] as const).map(cat => {
          const meta = CATEGORY_META[cat];
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-foreground text-sm">{meta.label}</h3>
                <Badge variant="outline" className="rounded-full text-xs font-normal">{meta.visits}</Badge>
              </div>
              <div className="space-y-2">
                {grouped[cat].map((reward, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-card rounded-xl border border-border/30 group hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Gift className="h-5 w-5 text-primary" />
                      </div>
                      <p className="font-medium text-sm text-foreground truncate">{reward.title}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 rounded-lg opacity-50 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => onSelectReward(reward.title)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

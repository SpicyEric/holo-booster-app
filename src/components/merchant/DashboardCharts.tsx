import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area 
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Users, TrendingUp } from "lucide-react";

interface DashboardChartsProps {
  merchantId: string | null;
}

type DateRange = 7 | 14 | 30 | 90;

interface HourData {
  hour: string;
  count: number;
}

interface AgeData {
  age: string;
  count: number;
}

interface GrowthData {
  date: string;
  total: number;
}

const DateRangeSelector = ({ 
  value, 
  onChange 
}: { 
  value: DateRange; 
  onChange: (v: DateRange) => void;
}) => (
  <div className="flex gap-1">
    {([7, 14, 30, 90] as DateRange[]).map((days) => (
      <Button
        key={days}
        variant={value === days ? "default" : "outline"}
        size="sm"
        className="h-7 text-xs px-2"
        onClick={() => onChange(days)}
      >
        {days}T
      </Button>
    ))}
  </div>
);

export function DashboardCharts({ merchantId }: DashboardChartsProps) {
  const [hourlyData, setHourlyData] = useState<HourData[]>([]);
  const [ageData, setAgeData] = useState<AgeData[]>([]);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  
  const [hourlyRange, setHourlyRange] = useState<DateRange>(30);
  const [ageRange, setAgeRange] = useState<DateRange>(30);
  const [growthRange, setGrowthRange] = useState<DateRange>(30);

  useEffect(() => {
    if (merchantId) {
      loadHourlyData();
    }
  }, [merchantId, hourlyRange]);

  useEffect(() => {
    if (merchantId) {
      loadAgeData();
    }
  }, [merchantId, ageRange]);

  useEffect(() => {
    if (merchantId) {
      loadGrowthData();
    }
  }, [merchantId, growthRange]);

  const loadHourlyData = async () => {
    if (!merchantId) return;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - hourlyRange);

    const { data: transactions } = await supabase
      .from("point_transactions")
      .select("created_at")
      .eq("merchant_customer_id", merchantId)
      .gte("created_at", startDate.toISOString());

    // Initialize all 24 hours
    const hourCounts: Record<number, number> = {};
    for (let i = 0; i < 24; i++) {
      hourCounts[i] = 0;
    }

    (transactions || []).forEach((tx: any) => {
      if (tx.created_at) {
        const hour = new Date(tx.created_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });

    const data: HourData[] = Object.entries(hourCounts).map(([hour, count]) => ({
      hour: `${hour}:00`,
      count: count as number,
    }));

    setHourlyData(data);
  };

  const loadAgeData = async () => {
    if (!merchantId) return;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - ageRange);

    // Get loyalty accounts created in range
    const { data: loyaltyAccounts } = await supabase
      .from("loyalty_accounts")
      .select("user_id, created_at")
      .eq("merchant_customer_id", merchantId)
      .gte("created_at", startDate.toISOString());

    const userIds = (loyaltyAccounts || []).map((acc: any) => acc.user_id);
    
    // Age brackets from 14-80+
    const ageBrackets = [
      { label: "14-17", min: 14, max: 17 },
      { label: "18-24", min: 18, max: 24 },
      { label: "25-34", min: 25, max: 34 },
      { label: "35-44", min: 35, max: 44 },
      { label: "45-54", min: 45, max: 54 },
      { label: "55-64", min: 55, max: 64 },
      { label: "65-74", min: 65, max: 74 },
      { label: "75+", min: 75, max: 150 },
    ];

    const ageCounts: Record<string, number> = {};
    ageBrackets.forEach(b => ageCounts[b.label] = 0);

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("birth_date")
        .in("user_id", userIds);

      (profiles || []).forEach((profile: any) => {
        if (profile.birth_date) {
          const age = Math.floor(
            (Date.now() - new Date(profile.birth_date).getTime()) / 
            (365.25 * 24 * 60 * 60 * 1000)
          );
          
          const bracket = ageBrackets.find(b => age >= b.min && age <= b.max);
          if (bracket) {
            ageCounts[bracket.label] = (ageCounts[bracket.label] || 0) + 1;
          }
        }
      });
    }

    const data: AgeData[] = ageBrackets.map(b => ({
      age: b.label,
      count: ageCounts[b.label] || 0,
    }));

    setAgeData(data);
  };

  const loadGrowthData = async () => {
    if (!merchantId) return;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - growthRange);

    // Get all loyalty accounts up to now
    const { data: allAccounts } = await supabase
      .from("loyalty_accounts")
      .select("created_at")
      .eq("merchant_customer_id", merchantId)
      .order("created_at", { ascending: true });

    // Group by date and calculate cumulative
    const dailyCounts: Record<string, number> = {};
    
    // Initialize all days in range
    for (let i = 0; i < growthRange; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (growthRange - 1 - i));
      const dateStr = date.toISOString().split("T")[0];
      dailyCounts[dateStr] = 0;
    }

    // Count accounts created each day
    (allAccounts || []).forEach((acc: any) => {
      if (acc.created_at) {
        const dateStr = acc.created_at.split("T")[0];
        if (dailyCounts.hasOwnProperty(dateStr)) {
          dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
        }
      }
    });

    // Calculate cumulative and format
    let cumulative = 0;
    
    // First, count all accounts before the range
    const rangeStart = new Date();
    rangeStart.setDate(rangeStart.getDate() - growthRange);
    (allAccounts || []).forEach((acc: any) => {
      if (acc.created_at && new Date(acc.created_at) < rangeStart) {
        cumulative++;
      }
    });

    const data: GrowthData[] = Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => {
        cumulative += count;
        return {
          date: new Date(date).toLocaleDateString("de-DE", { 
            day: "2-digit", 
            month: "2-digit" 
          }),
          total: cumulative,
        };
      });

    setGrowthData(data);
  };

  if (!merchantId) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Sammelzeiten Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Stempelzeiten
            </CardTitle>
            <DateRangeSelector value={hourlyRange} onChange={setHourlyRange} />
          </div>
          <p className="text-xs text-muted-foreground">
            Verteilung der Stempel nach Uhrzeit
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="colorHour" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="hour" 
                  tick={{ fontSize: 10 }} 
                  tickLine={false}
                  interval={2}
                />
                <YAxis 
                  tick={{ fontSize: 10 }} 
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--background))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px"
                  }}
                  formatter={(value: number) => [`${value} Karte`, "Anzahl"]}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fill="url(#colorHour)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Altersgruppen Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Altersgruppen
            </CardTitle>
            <DateRangeSelector value={ageRange} onChange={setAgeRange} />
          </div>
          <p className="text-xs text-muted-foreground">
            Altersverteilung Ihrer Bonuskarten-Nutzer
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ageData}>
                <defs>
                  <linearGradient id="colorAge" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="age" 
                  tick={{ fontSize: 10 }} 
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10 }} 
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--background))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px"
                  }}
                  formatter={(value: number) => [`${value} Nutzer`, "Anzahl"]}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(262, 83%, 58%)" 
                  strokeWidth={2}
                  fill="url(#colorAge)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Nutzerzuwachs Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Nutzerzuwachs
            </CardTitle>
            <DateRangeSelector value={growthRange} onChange={setGrowthRange} />
          </div>
          <p className="text-xs text-muted-foreground">
            Kumulative Entwicklung Ihrer Bonuskarten-Nutzer
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  tickLine={false}
                  interval={Math.floor(growthRange / 7)}
                />
                <YAxis 
                  tick={{ fontSize: 10 }} 
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--background))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px"
                  }}
                  formatter={(value: number) => [`${value} Nutzer`, "Gesamt"]}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="hsl(142, 76%, 36%)" 
                  strokeWidth={2}
                  fill="url(#colorGrowth)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

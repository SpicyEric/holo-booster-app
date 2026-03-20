import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getUserCustomer } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, Users, Trophy, Gift, Zap, TrendingUp,
  AlertTriangle, Pause, Clock, Star, Image, MapPin, Megaphone,
  ArrowRight, Sparkles, ChevronRight, Target, CheckCircle2, Circle,
  Rocket
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, BarChart, Bar
} from "recharts";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

// ---- types ----
interface Customer { id: string; name: string; email: string; company_name: string | null; status: string; customer_number: number | null; }
interface SubscriptionInfo { hasSubscription: boolean; status?: string; currentPeriodEnd?: string; cancelAtPeriodEnd?: boolean; cancelAt?: string | null; }
interface DashboardStats { totalContacts: number; totalStamps: number; totalRedemptions: number; networkEffect: number; newContacts7Days: number; }
interface HourlyData { hour: string; count: number; }
interface GrowthData { date: string; total: number; }
interface GenderData { gender: string; count: number; percentage: number; }
interface AgeData { age: string; count: number; }
interface CustomerSegment { name: string; label: string; count: number; percentage: number; color: string; bgColor: string; }
type DateRange = 7 | 14 | 30 | 90;

// Demo merchant
const DEMO_MERCHANT_ID = "e8e3db26-fd15-455a-ad47-50ed25081e3c";
const DEMO_STATS: DashboardStats = { totalContacts: 2400, totalStamps: 93000, totalRedemptions: 800, networkEffect: 600, newContacts7Days: 47 };
const generateDemoHourlyData = (): HourlyData[] => {
  const p = [2,3,1,0,0,0,8,45,120,280,350,380,320,290,340,410,450,420,280,150,80,35,15,5];
  return p.map((c,h)=>({ hour: `${h}:00`, count: c }));
};
const generateDemoGrowthData = (days: number): GrowthData[] => {
  const data: GrowthData[] = []; let base = 2400 - Math.floor(days * 6.5);
  for (let i = 0; i < days; i++) { const d = new Date(); d.setDate(d.getDate()-(days-1-i)); base += Math.floor(4+Math.random()*8); data.push({ date: d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"}), total: base }); }
  return data;
};
const DEMO_GENDER_DATA: GenderData[] = [{ gender: "Männlich", count: 1560, percentage: 65 },{ gender: "Weiblich", count: 840, percentage: 35 }];
const DEMO_AGE_DATA: AgeData[] = [{age:"14-17",count:96},{age:"18-24",count:384},{age:"25-34",count:720},{age:"35-44",count:576},{age:"45-54",count:384},{age:"55-64",count:168},{age:"65+",count:72}];
const DEMO_SEGMENTS: CustomerSegment[] = [
  { name: "Neu", label: "1 Besuch", count: 480, percentage: 20, color: "#22C55E", bgColor: "bg-green-100" },
  { name: "Selten", label: "2-5 Besuche", count: 720, percentage: 30, color: "#A855F7", bgColor: "bg-purple-100" },
  { name: "Treu", label: "6-15 Besuche", count: 840, percentage: 35, color: "#3B82F6", bgColor: "bg-blue-100" },
  { name: "VIP", label: "15+ Besuche", count: 360, percentage: 15, color: "#F97316", bgColor: "bg-orange-100" }
];

// ---- small components ----
const DateRangeSelector = ({ value, onChange }: { value: DateRange; onChange: (v: DateRange) => void }) => (
  <div className="flex gap-1">
    {([7,14,30,90] as DateRange[]).map(d => (
      <button key={d} className={`px-3 py-1 text-xs rounded-full transition-all duration-200 font-medium ${value===d ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-white/60 text-muted-foreground hover:bg-white/80'}`} onClick={()=>onChange(d)}>{d}T</button>
    ))}
  </div>
);

const KpiCard = ({ icon: Icon, label, value, trend, iconBg, iconColor }: { icon: React.ElementType; label: string; value: string; trend?: string; iconBg: string; iconColor: string }) => (
  <div className="bg-white rounded-2xl p-5 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)] hover:shadow-[0_4px_12px_hsl(262,30%,80%/0.4)] transition-all duration-300 group">
    <div className="flex items-center justify-between mb-3">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105", iconBg)}>
        <Icon className={cn("w-5 h-5", iconColor)} />
      </div>
      {trend && (
        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{trend}</span>
      )}
    </div>
    <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
    <p className="text-sm text-muted-foreground mt-1">{label}</p>
  </div>
);

// ---- Mission item ----
interface Mission { label: string; description: string; completed: boolean; path: string; icon: React.ElementType; }

// ---- quick win item ----
interface QuickWin { label: string; description: string; icon: React.ElementType; path: string; color: string; }

export default function KundeDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [genderData, setGenderData] = useState<GenderData[]>([]);
  const [ageData, setAgeData] = useState<AgeData[]>([]);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [hourlyRange, setHourlyRange] = useState<DateRange>(30);
  const [growthRange, setGrowthRange] = useState<DateRange>(7);
  const [quickWins, setQuickWins] = useState<QuickWin[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);
  useEffect(() => { if (user) loadData(); }, [user]);

  useEffect(() => {
    if (customer?.id) {
      if (customer.id === DEMO_MERCHANT_ID) { setHourlyData(generateDemoHourlyData()); }
      else { loadHourlyData(customer.id); }
    }
  }, [customer?.id, hourlyRange]);

  useEffect(() => {
    if (customer?.id) {
      if (customer.id === DEMO_MERCHANT_ID) { setGrowthData(generateDemoGrowthData(growthRange)); }
      else { loadGrowthData(customer.id); }
    }
  }, [customer?.id, growthRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      let customerData = null;
      if (user?.id) {
        customerData = await getUserCustomer(user.id);
        if (customerData) {
          const { count: boxCount } = await supabase.from("customer_boxes").select("id", { count: "exact", head: true }).eq("customer_id", customerData.id);
          if (!boxCount || boxCount === 0) { navigate("/kunde/setup"); return; }
          setCustomer({ id: customerData.id, name: customerData.name, email: customerData.email || user.email || "", company_name: customerData.company_name, status: customerData.status || "active", customer_number: customerData.customer_number });
        }
      }
      try { const { data: subInfo } = await supabase.functions.invoke("get-subscription-info"); if (subInfo) setSubscriptionInfo(subInfo); } catch {}
      if (customerData?.id) {
        if (customerData.id === DEMO_MERCHANT_ID) {
          setStats(DEMO_STATS); setHourlyData(generateDemoHourlyData()); setGrowthData(generateDemoGrowthData(growthRange)); setGenderData(DEMO_GENDER_DATA); setAgeData(DEMO_AGE_DATA); setSegments(DEMO_SEGMENTS);
        } else {
          await Promise.all([loadDashboardStats(customerData.id), loadHourlyData(customerData.id), loadGrowthData(customerData.id), loadGenderData(customerData.id), loadAgeData(customerData.id), loadCustomerSegments(customerData.id)]);
        }
        buildQuickWins(customerData);
        buildMissions(customerData);
      } else {
        setStats({ totalContacts: 0, totalStamps: 0, totalRedemptions: 0, networkEffect: 0, newContacts7Days: 0 });
      }
    } catch (e) { console.error("Error loading data:", e); } finally { setLoading(false); }
  };

  const buildQuickWins = async (cust: any) => {
    const wins: QuickWin[] = [];
    if (!cust.cover_image_url) wins.push({ label: "Titelbild hochladen", description: "Mach dein Profil für Kunden attraktiver", icon: Image, path: "/kunde/mein-geschaeft", color: "text-blue-600" });
    if (!cust.google_review_url) wins.push({ label: "Google-Bewertungsbonus aktivieren", description: "Erhalte mehr Sichtbarkeit durch Kundenbewertungen", icon: Star, path: "/kunde/marketing", color: "text-amber-600" });
    const oh = cust.opening_hours;
    if (!oh || Object.keys(oh).length === 0) wins.push({ label: "Öffnungszeiten eintragen", description: "Hilf Kunden, dich zum richtigen Zeitpunkt zu finden", icon: Clock, path: "/kunde/mein-geschaeft", color: "text-green-600" });
    wins.push({ label: "Neukunden-Kampagne starten", description: "Pushe dein Geschäft und gewinne neue Kunden", icon: Megaphone, path: "/kunde/marketing", color: "text-primary" });
    if (!cust.description) wins.push({ label: "Geschäftsbeschreibung vervollständigen", description: "Zeige Kunden, was dich besonders macht", icon: MapPin, path: "/kunde/mein-geschaeft", color: "text-rose-600" });
    setQuickWins(wins.slice(0, 4));
  };

  const buildMissions = async (cust: any) => {
    const m: Mission[] = [
      { label: "Geschäftsprofil vervollständigen", description: "Logo, Titelbild und Beschreibung", completed: !!(cust.logo_url && cust.cover_image_url && cust.description), path: "/kunde/mein-geschaeft", icon: Store },
      { label: "Erste Prämie erstellen", description: "Belohnungen für deine Kunden", completed: false, path: "/kunde/marketing", icon: Gift },
      { label: "Google-Bewertungen aktivieren", description: "Steigere deine Online-Sichtbarkeit", completed: !!cust.google_review_points_enabled, path: "/kunde/marketing", icon: Star },
      { label: "Öffnungszeiten eintragen", description: "Damit Kunden wissen, wann du da bist", completed: !!(cust.opening_hours && Object.keys(cust.opening_hours).length > 0), path: "/kunde/mein-geschaeft", icon: Clock },
      { label: "Erste Kampagne starten", description: "Werde sichtbar für neue Kunden", completed: false, path: "/kunde/marketing", icon: Rocket },
    ];
    // Check rewards
    const { count } = await supabase.from("rewards").select("*", { count: "exact", head: true }).eq("merchant_customer_id", cust.id).eq("is_active", true);
    m[1].completed = (count || 0) > 0;
    // Check boosts
    const { count: boostCount } = await supabase.from("merchant_boosts").select("*", { count: "exact", head: true }).eq("merchant_customer_id", cust.id);
    m[4].completed = (boostCount || 0) > 0;
    setMissions(m);
  };

  // ---- data loaders ----
  const loadDashboardStats = async (cid: string) => {
    try {
      const [c1,c2,c3,c4,c5] = await Promise.all([
        supabase.from("loyalty_accounts").select("*",{count:"exact",head:true}).eq("merchant_customer_id",cid),
        supabase.from("point_transactions").select("*",{count:"exact",head:true}).eq("merchant_customer_id",cid).eq("transaction_type","nfc_stamp"),
        supabase.from("reward_redemptions").select("*",{count:"exact",head:true}).eq("merchant_customer_id",cid),
        supabase.from("point_transactions").select("*",{count:"exact",head:true}).eq("merchant_customer_id",cid).eq("transaction_type","new_customer_bonus"),
        (() => { const d=new Date(); d.setDate(d.getDate()-7); return supabase.from("loyalty_accounts").select("*",{count:"exact",head:true}).eq("merchant_customer_id",cid).gte("created_at",d.toISOString()); })()
      ]);
      const offerRed = await supabase.from("point_transactions").select("*",{count:"exact",head:true}).eq("merchant_customer_id",cid).eq("transaction_type","offer_redeemed");
      setStats({ totalContacts: c1.count||0, totalStamps: c2.count||0, totalRedemptions: (c3.count||0)+(offerRed.count||0), networkEffect: c4.count||0, newContacts7Days: c5.count||0 });
    } catch { setStats({ totalContacts:0, totalStamps:0, totalRedemptions:0, networkEffect:0, newContacts7Days:0 }); }
  };

  const loadHourlyData = async (cid: string) => {
    const s = new Date(); s.setDate(s.getDate()-hourlyRange);
    const { data: txs } = await supabase.from("point_transactions").select("created_at").eq("merchant_customer_id",cid).gt("points_change",0).gte("created_at",s.toISOString());
    const hc: Record<number,number> = {}; for(let i=0;i<24;i++) hc[i]=0;
    (txs||[]).forEach((t:any)=>{ if(t.created_at) hc[new Date(t.created_at).getHours()]++; });
    setHourlyData(Object.entries(hc).map(([h,c])=>({ hour:`${h}:00`, count:c })));
  };

  const loadGrowthData = async (cid: string) => {
    const s = new Date(); s.setDate(s.getDate()-growthRange);
    const { data: all } = await supabase.from("loyalty_accounts").select("created_at").eq("merchant_customer_id",cid).order("created_at",{ascending:true});
    const dc: Record<string,number> = {};
    for(let i=0;i<growthRange;i++){ const d=new Date(); d.setDate(d.getDate()-(growthRange-1-i)); dc[d.toISOString().split("T")[0]]=0; }
    (all||[]).forEach((a:any)=>{ if(a.created_at){ const ds=a.created_at.split("T")[0]; if(dc.hasOwnProperty(ds)) dc[ds]++; } });
    let cum=0; const rs=new Date(); rs.setDate(rs.getDate()-growthRange);
    (all||[]).forEach((a:any)=>{ if(a.created_at&&new Date(a.created_at)<rs) cum++; });
    setGrowthData(Object.entries(dc).sort(([a],[b])=>a.localeCompare(b)).map(([d,c])=>{ cum+=c; return { date: new Date(d).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"}), total: cum }; }));
  };

  const loadGenderData = async (cid: string) => {
    const { data: la } = await supabase.from("loyalty_accounts").select("user_id").eq("merchant_customer_id",cid);
    if(!la||la.length===0){ setGenderData([{gender:"Männlich",count:0,percentage:0},{gender:"Weiblich",count:0,percentage:0}]); return; }
    const { data: profiles } = await supabase.from("profiles").select("gender").in("user_id",la.map(a=>a.user_id));
    let m=0,f=0; (profiles||[]).forEach((p:any)=>{ if(p.gender==="männlich"||p.gender==="male") m++; else if(p.gender==="weiblich"||p.gender==="female") f++; });
    const t=m+f; setGenderData([{gender:"Männlich",count:m,percentage:t>0?Math.round(m/t*100):0},{gender:"Weiblich",count:f,percentage:t>0?Math.round(f/t*100):0}]);
  };

  const loadAgeData = async (cid: string) => {
    const { data: la } = await supabase.from("loyalty_accounts").select("user_id").eq("merchant_customer_id",cid);
    const brackets = [{label:"14-17",min:14,max:17},{label:"18-24",min:18,max:24},{label:"25-34",min:25,max:34},{label:"35-44",min:35,max:44},{label:"45-54",min:45,max:54},{label:"55-64",min:55,max:64},{label:"65+",min:65,max:150}];
    const ac: Record<string,number> = {}; brackets.forEach(b=>ac[b.label]=0);
    if(la&&la.length>0){ const { data: ps } = await supabase.from("profiles").select("birth_date").in("user_id",la.map(a=>a.user_id));
      (ps||[]).forEach((p:any)=>{ if(p.birth_date){ const age=Math.floor((Date.now()-new Date(p.birth_date).getTime())/(365.25*24*60*60*1000)); const br=brackets.find(b=>age>=b.min&&age<=b.max); if(br) ac[br.label]++; } });
    }
    setAgeData(brackets.map(b=>({ age: b.label, count: ac[b.label]||0 })));
  };

  const loadCustomerSegments = async (cid: string) => {
    const { data: la } = await supabase.from("loyalty_accounts").select("id, user_id").eq("merchant_customer_id",cid);
    if(!la||la.length===0){ setSegments([{name:"Neu",label:"1 Besuch",count:0,percentage:0,color:"#22C55E",bgColor:"bg-green-100"},{name:"Selten",label:"2-5 Besuche",count:0,percentage:0,color:"#A855F7",bgColor:"bg-purple-100"},{name:"Treu",label:"6-15 Besuche",count:0,percentage:0,color:"#3B82F6",bgColor:"bg-blue-100"},{name:"VIP",label:"15+ Besuche",count:0,percentage:0,color:"#F97316",bgColor:"bg-orange-100"}]); return; }
    const utc: Record<string,number> = {};
    for(const acc of la){ const {count}=await supabase.from("point_transactions").select("*",{count:"exact",head:true}).eq("merchant_customer_id",cid).eq("loyalty_account_id",acc.id).eq("transaction_type","nfc_stamp"); utc[acc.id]=count||0; }
    let n=0,s=0,t2=0,v=0; Object.values(utc).forEach(c=>{ if(c<=1)n++;else if(c<=5)s++;else if(c<=15)t2++;else v++; });
    const tot=la.length;
    setSegments([{name:"Neu",label:"1 Besuch",count:n,percentage:tot>0?Math.round(n/tot*100):0,color:"#22C55E",bgColor:"bg-green-100"},{name:"Selten",label:"2-5 Besuche",count:s,percentage:tot>0?Math.round(s/tot*100):0,color:"#A855F7",bgColor:"bg-purple-100"},{name:"Treu",label:"6-15 Besuche",count:t2,percentage:tot>0?Math.round(t2/tot*100):0,color:"#3B82F6",bgColor:"bg-blue-100"},{name:"VIP",label:"15+ Besuche",count:v,percentage:tot>0?Math.round(v/tot*100):0,color:"#F97316",bgColor:"bg-orange-100"}]);
  };

  const formatDate = (ds: string) => new Date(ds).toLocaleDateString("de-DE",{ year:'numeric', month:'long', day:'numeric' });

  // Gamification helpers
  const completedMissions = missions.filter(m => m.completed).length;
  const totalMissions = missions.length;
  const progressPercent = totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0;
  const levelLabel = progressPercent >= 100 ? "Profi" : progressPercent >= 60 ? "Aktiv wachsend" : progressPercent >= 20 ? "Guter Start" : "Einsteiger";

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8 space-y-8">

        {/* ====== Hero / Welcome ====== */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(262,60%,45%)] via-[hsl(262,70%,50%)] to-[hsl(230,70%,55%)] p-8 text-white shadow-[0_8px_30px_hsl(262,50%,40%/0.35)]">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/[0.06] rounded-full blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/[0.04] rounded-full blur-3xl animate-[pulse_10s_ease-in-out_infinite_2s]" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 opacity-70" />
              <span className="text-sm font-medium opacity-70">Dein Eloyo-Dashboard</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight leading-[1.1]">
              Willkommen zurück{customer?.company_name ? `, ${customer.company_name}` : ''}!
            </h1>
            <p className="mt-2 text-base opacity-75 max-w-xl">
              Hier siehst du, wie dein Kundenbindungssystem läuft und wo du als Nächstes optimieren kannst.
            </p>
            {stats && (
              <div className="flex items-center gap-3 mt-5">
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-full px-3 py-1 backdrop-blur-sm">
                  <TrendingUp className="w-3 h-3 mr-1" /> +{stats.newContacts7Days} neue Kunden diese Woche
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Status Alerts */}
        {customer?.status === "paused" && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <Pause className="w-5 h-5 text-amber-600 mt-0.5" />
            <div><p className="font-semibold text-amber-900">Abo pausiert</p><p className="text-sm text-amber-700">Während der Pause bist du nicht in der Endkunden-App sichtbar.</p></div>
          </div>
        )}
        {subscriptionInfo?.cancelAtPeriodEnd && subscriptionInfo.cancelAt && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div><p className="font-semibold text-amber-900">Kündigung eingereicht</p><p className="text-sm text-amber-700">Dein Abonnement endet am {formatDate(subscriptionInfo.cancelAt)}</p></div>
          </div>
        )}

        {/* ====== Fortschritts-Modul (Gamification) ====== */}
        {missions.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Dein Fortschritt</h2>
                  <p className="text-sm text-muted-foreground">{completedMissions} von {totalMissions} Optimierungen abgeschlossen</p>
                </div>
              </div>
              <Badge variant="outline" className="rounded-full border-primary/30 text-primary font-medium px-3">
                {levelLabel}
              </Badge>
            </div>
            <Progress value={progressPercent} className="h-2.5 mb-5 bg-primary/10 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-secondary" />
            <div className="space-y-2">
              {missions.map((mission, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (!mission.completed) navigate(mission.path);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200",
                    mission.completed
                      ? "bg-emerald-50/80 cursor-default"
                      : "hover:bg-primary/[0.04] cursor-pointer group"
                  )}
                >
                  {mission.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0 group-hover:text-primary/60 transition-colors" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", mission.completed ? "text-emerald-700 line-through" : "text-foreground")}>{mission.label}</p>
                    <p className="text-xs text-muted-foreground">{mission.description}</p>
                  </div>
                  {!mission.completed && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ====== KPI Cards ====== */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Deine Kennzahlen</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={Users} label="Neue Kunden" value={stats?.totalContacts?.toLocaleString('de-DE') || '0'} trend={stats && stats.newContacts7Days > 0 ? `+${stats.newContacts7Days} diese Woche` : undefined} iconBg="bg-primary/10" iconColor="text-primary" />
            <KpiCard icon={Trophy} label="Punkte vergeben" value={stats?.totalStamps?.toLocaleString('de-DE') || '0'} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
            <KpiCard icon={Gift} label="Prämien eingelöst" value={stats?.totalRedemptions?.toLocaleString('de-DE') || '0'} iconBg="bg-amber-50" iconColor="text-amber-600" />
            <KpiCard icon={Zap} label="Kunden aktiviert" value={stats?.networkEffect?.toLocaleString('de-DE') || '0'} iconBg="bg-purple-50" iconColor="text-purple-600" />
          </div>
        </div>

        {/* ====== Quick Wins ====== */}
        {quickWins.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Empfohlene nächste Schritte</h2>
            <p className="text-sm text-muted-foreground mb-4">Optimiere dein System für bessere Ergebnisse</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickWins.map((win, i) => (
                <button
                  key={i}
                  onClick={() => navigate(win.path)}
                  className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-border/30 hover:border-primary/30 hover:shadow-[0_4px_12px_hsl(262,30%,80%/0.3)] transition-all duration-300 text-left group active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/[0.06] flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    <win.icon className={cn("w-5 h-5", win.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">{win.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{win.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ====== Performance Charts ====== */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Performance & Aktivität</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-muted-foreground" /><h3 className="font-semibold text-foreground">Häufigste Stempelzeiten</h3></div>
                <DateRangeSelector value={hourlyRange} onChange={setHourlyRange} />
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData}>
                    <defs><linearGradient id="colorHour" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(262,83%,58%)" stopOpacity={0.3}/><stop offset="95%" stopColor="hsl(262,83%,58%)" stopOpacity={0}/></linearGradient></defs>
                    <XAxis dataKey="hour" tick={{fontSize:10,fill:'hsl(0,0%,40%)'}} tickLine={false} axisLine={false} interval={3}/>
                    <YAxis tick={{fontSize:10,fill:'hsl(0,0%,40%)'}} tickLine={false} axisLine={false}/>
                    <Tooltip contentStyle={{backgroundColor:"hsl(0,0%,100%)",border:"1px solid hsl(0,0%,90%)",borderRadius:"12px",boxShadow:"0 4px 12px rgba(0,0,0,0.08)"}} formatter={(v:number)=>[`${v} Stempel`,"Anzahl"]}/>
                    <Area type="monotone" dataKey="count" stroke="hsl(262,83%,58%)" strokeWidth={2} fill="url(#colorHour)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-muted-foreground" /><h3 className="font-semibold text-foreground">Kundenzuwachs</h3></div>
                <DateRangeSelector value={growthRange} onChange={setGrowthRange} />
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData}>
                    <defs><linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/><stop offset="95%" stopColor="#22C55E" stopOpacity={0}/></linearGradient></defs>
                    <XAxis dataKey="date" tick={{fontSize:10,fill:'hsl(0,0%,40%)'}} tickLine={false} axisLine={false} interval={Math.max(1,Math.floor(growthRange/6))}/>
                    <YAxis tick={{fontSize:10,fill:'hsl(0,0%,40%)'}} tickLine={false} axisLine={false}/>
                    <Tooltip contentStyle={{backgroundColor:"hsl(0,0%,100%)",border:"1px solid hsl(0,0%,90%)",borderRadius:"12px",boxShadow:"0 4px 12px rgba(0,0,0,0.08)"}} formatter={(v:number)=>[`${v} Kunden`,"Gesamt"]}/>
                    <Area type="monotone" dataKey="total" stroke="#22C55E" strokeWidth={2} fill="url(#colorGrowth)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* ====== Kundengruppen ====== */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Kundengruppen</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {segments.map(seg => (
              <div key={seg.name} className="bg-white rounded-2xl p-5 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)] text-center hover:shadow-[0_4px_12px_hsl(262,30%,80%/0.3)] transition-all duration-300">
                <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: seg.color + '15' }}>
                  <span className="text-xs font-bold" style={{ color: seg.color }}>{seg.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{seg.label}</p>
                <p className="text-3xl font-bold text-foreground">{seg.percentage}%</p>
                <p className="text-xs text-muted-foreground mt-1">{seg.count.toLocaleString('de-DE')} Kunden</p>
              </div>
            ))}
          </div>
        </div>

        {/* ====== Kunden-Insights ====== */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Kunden-Insights</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
              <h3 className="font-semibold text-foreground mb-6">Nach Geschlecht</h3>
              <div className="flex items-center justify-center">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F97316" strokeWidth="3" strokeDasharray={`${genderData[1]?.percentage||0}, 100`}/>
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(262,83%,58%)" strokeWidth="3" strokeDasharray={`${genderData[0]?.percentage||0}, 100`} strokeDashoffset={`-${genderData[1]?.percentage||0}`}/>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm text-muted-foreground">Männlich</span>
                    <span className="text-2xl font-bold text-foreground">{genderData[0]?.percentage||0}%</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
              <h3 className="font-semibold text-foreground mb-6">Nach Alter</h3>
              <div className="h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageData}>
                    <XAxis dataKey="age" tick={{fontSize:10,fill:'hsl(0,0%,40%)'}} tickLine={false} axisLine={false}/>
                    <YAxis hide/>
                    <Tooltip contentStyle={{backgroundColor:"hsl(0,0%,100%)",border:"1px solid hsl(0,0%,90%)",borderRadius:"12px",boxShadow:"0 4px 12px rgba(0,0,0,0.08)"}} formatter={(v:number)=>[`${v} Kunden`,"Anzahl"]}/>
                    <Bar dataKey="count" fill="hsl(262,83%,58%)" radius={[6,6,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

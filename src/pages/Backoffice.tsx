import PageLayout from '@/components/PageLayout';
import { motion, type Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  Gift,
  Activity,
  Cake,
  HeartHandshake,
  Check,
  Sparkles,
  Trophy,
  Zap,
  Target,
  CheckCircle2,
  Circle,
  UserPlus,
  ChevronRight,
  Star,
} from 'lucide-react';
import eloyoAppMockup from '@/assets/eloyo-app-mockup.jpg';
import CountUp from '@/components/CountUp';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts';
import { Clock as ClockIcon } from 'lucide-react';

/* ─── Apple-style cubic-bezier ─── */
const appleEase = [0.16, 1, 0.3, 1] as const;

const glassReveal: Variants = {
  hidden: { opacity: 0, y: 30, filter: 'blur(12px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: appleEase },
  },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const viewportConfig = { once: true, margin: '-80px' as any };

const buttonMotion = {
  whileHover: { scale: 1.04 },
  whileTap: { scale: 0.97 },
};

const stats: Array<{
  value: string;
  label: string;
  countTo?: number;
  suffix?: string;
}> = [
  { value: '98%', label: 'Push-Öffnungsrate', countTo: 98, suffix: '%' },
  { value: 'Ø 3 Min.', label: 'Einrichtungszeit pro Kunde' },
  { value: '100%', label: 'Automatisch im Hintergrund', countTo: 100, suffix: '%' },
];

const features = [
  {
    icon: Users,
    title: 'Kundenübersicht',
    desc: 'Alle Kunden auf einen Blick — Neukunden, Stammkunden und VIPs.',
  },
  {
    icon: TrendingUp,
    title: 'Wachstum verfolgen',
    desc: 'Verfolge deinen Kundenzuwachs und erkenne Trends in Echtzeit.',
  },
  {
    icon: Gift,
    title: 'Prämien & Einlösungen',
    desc: 'Sieh genau, welche Prämien am beliebtesten sind.',
  },
  {
    icon: Activity,
    title: 'Live-Aktivitäten',
    desc: 'Jede Transaktion, jeder Karte — alles live im Überblick.',
  },
];

const setupChecks = [
  'Persönliches Onboarding vor Ort',
  'Prämien individuell auf dein Geschäft abgestimmt',
  'Automatische Neukunden durch Empfehlungen',
  'Inaktive Kunden werden automatisch reaktiviert',
  'Geburtstagsnachrichten laufen von alleine',
  'Push-Nachrichten direkt auf das Handy deiner Kunden',
];

const Backoffice = () => {
  const navigate = useNavigate();

  return (
    <PageLayout>
      {/* ═══════ SEKTION 1 — HERO ═══════ */}
      <section className="relative z-10 px-6 pt-32 pb-16 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-gradient-to-br from-primary to-secondary blur-[120px] opacity-20 rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] bg-blue-400 blur-[120px] opacity-10 rounded-full pointer-events-none" />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          className="max-w-5xl mx-auto text-center relative z-10"
        >
          <motion.div
            variants={glassReveal}
            className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Dein Backoffice
          </motion.div>
          <motion.h1
            variants={glassReveal}
            className="font-headline text-5xl md:text-7xl font-extrabold text-[#1a1b21] leading-[1.1] mb-6 tracking-[-0.02em]"
          >
            Alles im Blick.{' '}
            <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              Alles unter Kontrolle.
            </span>
          </motion.h1>
          <motion.p
            variants={glassReveal}
            className="text-xl text-[#4a4455] leading-relaxed max-w-3xl mx-auto"
          >
            Als Eloyo-Partner bekommst du ein leistungsstarkes Dashboard — du
            siehst auf einen Blick wie dein Geschäft läuft und steuerst alles
            von einem Ort aus.
          </motion.p>
        </motion.div>

        {/* Statisches Dashboard-Mockup (1:1 Replikation des echten Backoffice) */}
        <motion.div
          variants={glassReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          className="max-w-[1200px] mx-auto mt-16 relative z-10"
        >
          <div className="rounded-3xl overflow-hidden border border-[#e8e7ef] bg-[hsl(262,40%,93%)] shadow-2xl shadow-primary/10">
            <div className="p-6 lg:p-8 space-y-6">

              {/* Hero-Header */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(262,60%,45%)] via-[hsl(262,70%,50%)] to-[hsl(230,70%,55%)] p-8 text-white shadow-[0_8px_30px_hsl(262,50%,40%/0.35)]">
                <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/[0.06] rounded-full blur-3xl" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/[0.04] rounded-full blur-3xl" />
                <div className="relative z-10 flex items-end justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-5 w-5 opacity-70" />
                      <span className="text-sm font-medium opacity-70">Dein Eloyo-Dashboard</span>
                    </div>
                    <h3 className="font-headline text-3xl lg:text-4xl font-bold tracking-tight leading-[1.1]">
                      Willkommen zurück, Backstube König!
                    </h3>
                    <p className="mt-2 text-base opacity-75 max-w-xl">
                      Hier siehst du, wie dein Kundenbindungssystem läuft und wo du als Nächstes optimieren kannst.
                    </p>
                    <div className="flex items-center gap-3 mt-5">
                      <span className="inline-flex items-center bg-white/20 text-white text-xs font-medium rounded-full px-3 py-1 backdrop-blur-sm">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +117 neue Kunden diese Woche
                      </span>
                    </div>
                  </div>
                  <div className="hidden lg:flex flex-col items-end gap-3">
                    <span className="text-[10px] font-semibold tracking-[0.2em] uppercase opacity-60">
                      Deine bisherigen Erfolge
                    </span>
                    <div className="flex items-center gap-2">
                      {[Star, Gift, Sparkles, Trophy].map((Icon, i) => (
                        <div key={i} className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
                          <Icon className="w-4 h-4 text-white/90" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* KPI-Kacheln */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: Users, countTo: 832, separator: '.', label: 'Kunden gesamt', trend: '+117 diese Woche', iconBg: 'bg-primary/10', iconColor: 'text-primary' },
                  { icon: Trophy, countTo: 6102, separator: '.', label: 'Karte gesamt', sub: 'Gesamt seit Start', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
                  { icon: Gift, countTo: 312, separator: '.', label: 'Prämien eingelöst', iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
                  { icon: Zap, countTo: 387, separator: '.', label: 'Netzwerkeffekt', sub: 'Neukundenprämien eingelöst', iconBg: 'bg-primary/10', iconColor: 'text-primary' },
                ].map((k) => (
                  <div key={k.label} className="bg-white rounded-2xl p-5 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.iconBg}`}>
                        <k.icon className={`w-5 h-5 ${k.iconColor}`} />
                      </div>
                      {k.trend && (
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {k.trend}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-foreground tracking-tight text-3xl lg:text-4xl">
                      <CountUp to={k.countTo} separator={k.separator} duration={2.2} />
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{k.label}</p>
                    {k.sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{k.sub}</p>}
                  </div>
                ))}
              </div>

              {/* Fortschritt + Empfohlene Schritte */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Dein Fortschritt */}
                <div className="bg-white rounded-2xl p-6 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Target className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">Dein Fortschritt</p>
                        <p className="text-xs text-muted-foreground">4/5 erledigt</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                      Aktiv wachsend
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full" style={{ width: '80%' }} />
                  </div>
                  <ul className="space-y-2">
                    {[
                      { label: 'Geschäftsprofil vervollständigen', done: true },
                      { label: 'Deine fünfte Prämie erstellen', done: true },
                      { label: 'Google-Bewertungen aktivieren', done: true },
                      { label: 'Öffnungszeiten eintragen', done: true },
                      { label: 'Neukundenprämie hinzufügen', done: false },
                    ].map((m) => (
                      <li
                        key={m.label}
                        className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${
                          m.done ? 'bg-emerald-50/50' : 'bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {m.done ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />
                          )}
                          <span
                            className={`text-sm truncate ${
                              m.done ? 'text-emerald-700 line-through' : 'text-foreground'
                            }`}
                          >
                            {m.label}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Empfohlene nächste Schritte */}
                <div>
                  <div className="mb-4">
                    <p className="font-bold text-foreground">Empfohlene nächste Schritte</p>
                    <p className="text-sm text-muted-foreground">Optimiere dein System für bessere Ergebnisse</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <UserPlus className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground mb-1">Neukundenprämie hinzufügen</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Erstelle eine Neukundenprämie, die nur Nutzern angezeigt wird, die noch keine Punkte bei dir gesammelt haben — perfekt, um neue Kunden ins Geschäft zu holen.
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 mt-1" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════ SEKTION 2 — ZAHLEN ═══════ */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            className="bg-white/70 backdrop-blur-sm border border-[#e8e7ef] rounded-3xl px-8 py-14 md:py-16 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6"
          >
            {stats.map((s) => (
              <motion.div
                key={s.label}
                variants={glassReveal}
                className="text-center"
              >
                <div className="font-headline text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent tracking-[-0.02em] mb-3">
                  {typeof s.countTo === 'number' ? (
                    <CountUp to={s.countTo} duration={2} suffix={s.suffix ?? ''} />
                  ) : (
                    s.value
                  )}
                </div>
                <div className="text-sm md:text-base text-[#7b7487] font-medium">
                  {s.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════ SEKTION 3 — DASHBOARD ÜBERBLICK ═══════ */}
      <section className="relative z-10 py-24 px-6 bg-[#faf8ff]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <motion.p
              variants={glassReveal}
              className="text-primary font-bold text-sm tracking-[0.2em] uppercase mb-4"
            >
              Dein Backoffice
            </motion.p>
            <motion.h2
              variants={glassReveal}
              className="font-headline text-4xl md:text-5xl font-extrabold mb-6 tracking-[-0.02em]"
            >
              Volle Kontrolle. Jederzeit.
            </motion.h2>
            <motion.p
              variants={glassReveal}
              className="text-lg text-[#4a4455] leading-relaxed"
            >
              Sieh auf einen Blick wie viele Kunden du hast, wie viele Stempel
              gesammelt wurden und welche Prämien eingelöst werden. Alle
              Kennzahlen in Echtzeit — übersichtlich, klar, immer aktuell.
            </motion.p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={glassReveal}
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                className="bg-[#e8e7ef] rounded-[2rem] p-6 cursor-default"
              >
                <div className="h-12 w-12 rounded-xl bg-white/70 flex items-center justify-center mb-5">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-headline font-bold text-lg text-[#1a1b21] mb-2">
                  {f.title}
                </h3>
                <p className="text-[#4a4455] text-sm leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════ SEKTION 4 — GEBURTSTAGSNACHRICHTEN ═══════ */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
          >
            <motion.div
              variants={glassReveal}
              className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold mb-6"
            >
              <Cake className="w-4 h-4" />
              Automation
            </motion.div>
            <motion.h2
              variants={glassReveal}
              className="font-headline text-4xl md:text-5xl font-extrabold mb-6 tracking-[-0.02em] leading-[1.1]"
            >
              Kein Kunde wird vergessen.
            </motion.h2>
            <motion.p
              variants={glassReveal}
              className="text-lg text-[#4a4455] leading-relaxed"
            >
              Eloyo erkennt automatisch den Geburtstag deiner Kunden und schickt
              ihnen eine persönliche Nachricht mit einem Bonus — ganz ohne dass
              du etwas tun musst. Einmal einrichten, für immer aktiv.
            </motion.p>
          </motion.div>

          <motion.div
            variants={glassReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            className="flex justify-center"
          >
            <div className="relative">
              <div className="absolute -inset-8 bg-gradient-to-br from-primary/20 to-blue-400/10 blur-3xl rounded-full pointer-events-none" />
              <img
                src={eloyoAppMockup}
                alt="Geburtstagsnachricht in der Eloyo App"
                className="relative max-h-[520px] w-auto rounded-3xl"
                loading="lazy"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════ SEKTION 5 — CHURN-ERKENNUNG ═══════ */}
      <section className="relative z-10 py-24 px-6 bg-[#faf8ff]">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div
            variants={glassReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            className="order-2 lg:order-1"
          >
            <div className="relative w-full">
              <div className="absolute -inset-8 bg-gradient-to-br from-blue-400/20 to-primary/10 blur-3xl rounded-full pointer-events-none" />
              <div className="relative grid grid-cols-2 gap-4">

                {/* Stempelzeiten */}
                <div className="bg-white rounded-2xl p-4 border border-[#e8e7ef] shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
                  <div className="flex items-center gap-2 mb-1">
                    <ClockIcon className="w-3.5 h-3.5 text-primary" />
                    <h4 className="text-[13px] font-semibold text-[#1a1b21]">Stempelzeiten</h4>
                  </div>
                  <p className="text-[10px] text-[#7b7487] mb-2">Verteilung nach Uhrzeit</p>
                  <div className="h-[110px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { hour: '6', count: 4 }, { hour: '8', count: 18 }, { hour: '10', count: 32 },
                        { hour: '12', count: 48 }, { hour: '14', count: 36 }, { hour: '16', count: 42 },
                        { hour: '18', count: 28 }, { hour: '20', count: 12 }, { hour: '22', count: 5 },
                      ]}>
                        <defs>
                          <linearGradient id="bo-hour" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(262,83%,58%)" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="hsl(262,83%,58%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'hsl(0,0%,45%)' }} tickLine={false} axisLine={false} />
                        <YAxis hide />
                        <Area type="monotone" dataKey="count" stroke="hsl(262,83%,58%)" strokeWidth={2} fill="url(#bo-hour)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Kundenzuwachs */}
                <div className="bg-white rounded-2xl p-4 border border-[#e8e7ef] shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    <h4 className="text-[13px] font-semibold text-[#1a1b21]">Kundenzuwachs</h4>
                  </div>
                  <p className="text-[10px] text-[#7b7487] mb-2">Letzte 30 Tage</p>
                  <div className="h-[110px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { d: '01.', total: 612 }, { d: '03.', total: 615 }, { d: '05.', total: 624 },
                        { d: '07.', total: 626 }, { d: '09.', total: 658 }, { d: '11.', total: 663 },
                        { d: '13.', total: 668 }, { d: '15.', total: 705 }, { d: '17.', total: 712 },
                        { d: '19.', total: 714 }, { d: '21.', total: 738 }, { d: '23.', total: 742 },
                        { d: '25.', total: 776 }, { d: '27.', total: 782 }, { d: '29.', total: 815 },
                        { d: '30.', total: 832 },
                      ]}>
                        <defs>
                          <linearGradient id="bo-growth" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(142,76%,36%)" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="hsl(142,76%,36%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="d" tick={{ fontSize: 9, fill: 'hsl(0,0%,45%)' }} tickLine={false} axisLine={false} />
                        <YAxis hide />
                        <Area type="monotone" dataKey="total" stroke="hsl(142,76%,36%)" strokeWidth={2} fill="url(#bo-growth)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Kundengruppen */}
                <div className="bg-white rounded-2xl p-4 border border-[#e8e7ef] shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
                  <h4 className="text-[13px] font-semibold text-[#1a1b21] mb-3">Kundengruppen</h4>
                  <div className="space-y-2">
                    {[
                      { name: 'Neu', count: 184, pct: 22, color: 'hsl(142,71%,45%)' },
                      { name: 'Kunden', count: 312, pct: 38, color: 'hsl(217,91%,60%)' },
                      { name: 'Stammkunden', count: 226, pct: 27, color: 'hsl(262,83%,58%)' },
                      { name: 'VIP', count: 110, pct: 13, color: 'hsl(38,92%,50%)' },
                    ].map((seg) => (
                      <div key={seg.name} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-[#1a1b21]">{seg.name}</span>
                            <span className="text-[10px] text-[#7b7487]">{seg.pct}%</span>
                          </div>
                          <div className="h-1 bg-muted/40 rounded-full mt-0.5 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${seg.pct}%`, backgroundColor: seg.color }} />
                          </div>
                        </div>
                        <span className="text-[10px] text-[#7b7487] tabular-nums w-7 text-right">{seg.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Demografie */}
                <div className="bg-white rounded-2xl p-4 border border-[#e8e7ef] shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
                  <h4 className="text-[13px] font-semibold text-[#1a1b21] mb-3">Demografie</h4>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-[10px] text-[#1a1b21] font-medium">Männlich</span>
                      <span className="text-[10px] text-[#7b7487]">46%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <span className="text-[10px] text-[#1a1b21] font-medium">Weiblich</span>
                      <span className="text-[10px] text-[#7b7487]">54%</span>
                    </div>
                  </div>
                  <div className="h-[78px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { age: '18-24', male: 18, female: 22 },
                        { age: '25-34', male: 42, female: 48 },
                        { age: '35-44', male: 38, female: 44 },
                        { age: '45-54', male: 28, female: 32 },
                        { age: '55+', male: 16, female: 20 },
                      ]} barGap={1} barCategoryGap="20%">
                        <XAxis dataKey="age" tick={{ fontSize: 8, fill: 'hsl(0,0%,45%)' }} tickLine={false} axisLine={false} />
                        <YAxis hide />
                        <Bar dataKey="male" fill="hsl(262,83%,58%)" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="female" fill="#F97316" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            className="order-1 lg:order-2"
          >
            <motion.div
              variants={glassReveal}
              className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold mb-6"
            >
              <HeartHandshake className="w-4 h-4" />
              Automation
            </motion.div>
            <motion.h2
              variants={glassReveal}
              className="font-headline text-4xl md:text-5xl font-extrabold mb-6 tracking-[-0.02em] leading-[1.1]"
            >
              Inaktive Kunden kommen von selbst zurück.
            </motion.h2>
            <motion.p
              variants={glassReveal}
              className="text-lg text-[#4a4455] leading-relaxed"
            >
              Wenn ein Kunde längere Zeit nicht mehr da war, erkennt Eloyo das
              automatisch. Er bekommt dann eine persönliche Nachricht mit einem
              kleinen Punktebonus als Einladung zurückzukommen — einmalig pro
              Kunde, diskret und effektiv. Kein Aufwand für dich.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ═══════ SEKTION 6 — PERSÖNLICHES SETUP ═══════ */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
          >
            <motion.h2
              variants={glassReveal}
              className="font-headline text-4xl md:text-5xl font-extrabold mb-8 tracking-[-0.02em] leading-[1.1]"
            >
              Wir richten alles für dich ein —{' '}
              <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                du legst sofort los.
              </span>
            </motion.h2>
            <motion.p
              variants={glassReveal}
              className="text-lg text-[#4a4455] leading-relaxed mb-6"
            >
              Du bekommst kein Tool das du erst stundenlang konfigurieren musst.
              Wir kommen persönlich vorbei, richten dein komplettes System
              individuell für dein Geschäft ein und stellen sicher dass alles
              vom ersten Tag an funktioniert.
            </motion.p>
            <motion.p
              variants={glassReveal}
              className="text-lg text-[#4a4455] leading-relaxed mb-12"
            >
              Prämien, Automatisierungen, Nachrichten, Empfehlungsmarketing —
              alles ist direkt einsatzbereit und alltagstauglich. Du kannst
              danach jederzeit Anpassungen vornehmen wenn du möchtest, musst es
              aber nicht.
            </motion.p>

            <motion.ul
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-12"
            >
              {setupChecks.map((item) => (
                <motion.li
                  key={item}
                  variants={glassReveal}
                  className="flex items-start gap-3 bg-white/70 backdrop-blur-sm border border-[#e8e7ef] rounded-2xl px-5 py-4"
                >
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-4 w-4 text-primary" strokeWidth={3} />
                  </div>
                  <span className="text-[#1a1b21] font-medium">{item}</span>
                </motion.li>
              ))}
            </motion.ul>

            <motion.div variants={glassReveal}>
              <motion.button
                {...buttonMotion}
                onClick={() => navigate('/kontakt')}
                className="bg-gradient-to-r from-primary to-blue-500 text-white px-10 py-5 rounded-xl text-lg font-bold shadow-xl shadow-primary/25 hover:shadow-[0_20px_60px_rgba(124,58,237,0.25)] transition-shadow"
              >
                Jetzt kostenloses Setup anfragen
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Backoffice;

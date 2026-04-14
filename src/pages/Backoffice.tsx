import PageLayout from '@/components/PageLayout';
import { motion, type Variants } from 'framer-motion';
import { BarChart3, Users, TrendingUp, Gift, Activity, PieChart } from 'lucide-react';
import dashboardImg from '@/assets/backoffice-dashboard.png';
import transactionsImg from '@/assets/backoffice-transactions.png';

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

const features = [
  { icon: Users, title: 'Kundenübersicht', desc: 'Alle Kunden auf einen Blick – Neukunden, Stammkunden und VIPs.' },
  { icon: TrendingUp, title: 'Wachstum verfolgen', desc: 'Verfolge deinen Kundenzuwachs und erkenne Trends in Echtzeit.' },
  { icon: Gift, title: 'Prämien & Einlösungen', desc: 'Sieh genau, welche Prämien am beliebtesten sind.' },
  { icon: Activity, title: 'Live-Aktivitäten', desc: 'Jede Transaktion, jeder Stempel – alles live im Überblick.' },
];

const Backoffice = () => {
  return (
    <PageLayout>
      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            variants={staggerContainer}
          >
            <motion.p variants={glassReveal} className="text-primary font-semibold text-sm tracking-widest uppercase mb-4">
              Dein Backoffice
            </motion.p>
            <motion.h1 variants={glassReveal} className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Alles im Blick.<br />
              <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">Alles unter Kontrolle.</span>
            </motion.h1>
            <motion.p variants={glassReveal} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Als Eloyo-Partner bekommst du ein leistungsstarkes Dashboard, mit dem du dein Treuepunktsystem in Echtzeit verwaltest und optimierst.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Dashboard Section */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            variants={staggerContainer}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          >
            <motion.div variants={glassReveal} className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </div>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                Dein persönliches Händler-Dashboard
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Als Eloyo-Partner hast du Zugriff auf dein eigenes Dashboard mit allen wichtigen Kennzahlen. 
                Sieh auf einen Blick, wie viele Kunden du hast, wie viele Stempel gesammelt wurden und welche 
                Prämien eingelöst werden. Alles übersichtlich, alles in Echtzeit.
              </p>
              <ul className="space-y-3">
                {['Kundenanzahl & Wachstum', 'Stempel & Prämien im Überblick', 'Benachrichtigungen & Empfehlungen'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-foreground">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div variants={glassReveal}>
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/30 bg-background">
                <img src={dashboardImg} alt="Eloyo Händler-Dashboard mit KPIs und Benachrichtigungen" className="w-full h-auto" loading="lazy" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.h2 variants={glassReveal} className="text-3xl md:text-4xl font-bold mb-4">
              Was dein Backoffice alles kann
            </motion.h2>
            <motion.p variants={glassReveal} className="text-muted-foreground text-lg max-w-xl mx-auto">
              Alle Werkzeuge, die du brauchst – an einem Ort.
            </motion.p>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={glassReveal}
                className="bg-background/80 backdrop-blur-sm border border-border/40 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Transactions Section */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            variants={staggerContainer}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          >
            <motion.div variants={glassReveal} className="order-2 lg:order-1">
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/30 bg-background">
                <img src={transactionsImg} alt="Eloyo Transaktionsübersicht mit Kundenanalyse" className="w-full h-auto" loading="lazy" />
              </div>
            </motion.div>
            <motion.div variants={glassReveal} className="space-y-6 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium">
                <PieChart className="h-4 w-4" />
                Analyse
              </div>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                Detaillierte Kunden- & Transaktionsanalyse
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Behalte den Überblick über alle Transaktionen deines Geschäfts. Sieh genau, wann Stempel 
                gesammelt, Prämien eingelöst oder Bonuspunkte vergeben werden. Analysiere Kundengruppen, 
                Demografie und Stempelzeiten – alles in einer übersichtlichen Ansicht.
              </p>
              <ul className="space-y-3">
                {['Live-Transaktionsprotokoll', 'Kundengruppen & Demografie', 'Stempelzeiten & Aktivitätskurven'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-foreground">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            variants={staggerContainer}
          >
            <motion.h2 variants={glassReveal} className="text-3xl md:text-4xl font-bold mb-6">
              Bereit, dein Geschäft auf das nächste Level zu bringen?
            </motion.h2>
            <motion.p variants={glassReveal} className="text-muted-foreground text-lg mb-8">
              Starte jetzt mit Eloyo und erlebe, wie einfach Kundenbindung sein kann.
            </motion.p>
            <motion.div variants={glassReveal}>
              <a
                href="/kontakt"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full font-semibold text-lg hover:opacity-90 transition-opacity"
              >
                Jetzt Kontakt aufnehmen
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Backoffice;

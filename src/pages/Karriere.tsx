import ClassicNav from '@/components/ClassicNav';
import ERecht24Badge from '@/components/ERecht24Badge';
import Particles from '@/components/Particles';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/GlassCard';
import { motion } from 'framer-motion';
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  Users, 
  Rocket,
  Heart,
  Laptop,
  Coffee,
  TrendingUp,
  Code,
  Phone,
  Mail
} from 'lucide-react';
import eloyoLogo from '@/assets/eloyo-logo.png';

const Karriere = () => {
  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Karriere', href: '/karriere' },
    { label: 'Kontakt', href: '/kontakt' },
    { label: 'Datenschutz', href: '/datenschutz' },
    { label: 'Impressum', href: '/impressum' },
    { label: 'Login', href: '/auth' }
  ];

  const benefits = [
    {
      icon: TrendingUp,
      title: 'Attraktive Vergütung',
      description: 'Überdurchschnittliches Gehalt mit leistungsbezogenen Bonusmodellen'
    },
    {
      icon: Rocket,
      title: 'Wachstum & Entwicklung',
      description: 'Gestalte aktiv das Wachstum eines aufstrebenden Tech-Unternehmens mit'
    },
    {
      icon: Clock,
      title: 'Flexibilität',
      description: 'Remote-Arbeit möglich, flexible Arbeitszeiten und Work-Life-Balance'
    },
    {
      icon: Laptop,
      title: 'Moderne Ausstattung',
      description: 'Hochwertige Hardware, ergonomischer Arbeitsplatz und beste Tools'
    },
    {
      icon: Users,
      title: 'Starkes Team',
      description: 'Arbeite mit motivierten Menschen in einer offenen, wertschätzenden Atmosphäre'
    },
    {
      icon: Heart,
      title: 'Gesundheit & Fitness',
      description: 'Zuschuss zum Fitnessstudio und Zugang zu Wellness-Angeboten'
    }
  ];

  const jobs = [
    {
      id: 'inside-sales',
      title: 'Inside Sales Manager',
      subtitle: '(m/w/d)',
      location: 'München / Remote',
      type: 'Vollzeit',
      description: 'Du bist der erste Kontakt für potenzielle Kunden und begeisterst sie für unser innovatives NFC-Stempelsystem.',
      tasks: [
        'Aktiver Vertrieb unseres digitalen Kundenbindungssystems per Telefon und Video-Call',
        'Aufbau langfristiger Kundenbeziehungen mit lokalen Geschäften und Gastronomiebetrieben',
        'Eigenständige Erstellung und Nachverfolgung von Angeboten bis zum Vertragsabschluss',
        'Beratung von Interessenten zu den Vorteilen und Möglichkeiten von Eloyo',
        'Pflege und Dokumentation aller Kundenaktivitäten in unserem CRM-System'
      ],
      requirements: [
        'Erfahrung im telefonischen Vertrieb oder große Begeisterung für Sales – auch Quereinsteiger willkommen',
        'Ausgeprägte Kommunikationsstärke und die Fähigkeit, andere zu begeistern',
        'Eigenständige, zielorientierte Arbeitsweise mit hoher Eigenmotivation',
        'Interesse an digitalen Produkten und modernen Technologien',
        'Verhandlungssichere Deutschkenntnisse'
      ]
    },
    {
      id: 'fullstack-dev',
      title: 'Senior Full Stack Developer',
      subtitle: '(m/w/d)',
      location: 'München / Remote',
      type: 'Vollzeit',
      description: 'Du entwickelst die technische Zukunft von Eloyo – von der mobilen App bis zum Merchant-Dashboard.',
      tasks: [
        'Entwicklung und Weiterentwicklung unserer Web-Plattformen mit React und TypeScript',
        'Backend-Entwicklung mit Supabase, Edge Functions und PostgreSQL',
        'Mobile App-Entwicklung für iOS und Android',
        'Ganzheitliche Betreuung von Features – von der Konzeption bis zum Deployment',
        'Code Reviews, Testing und Dokumentation nach Best Practices'
      ],
      requirements: [
        'Fundierte Erfahrung in der Frontend-Entwicklung mit React/TypeScript',
        'Kenntnisse in Backend-Technologien (Node.js, SQL-Datenbanken)',
        'Erfahrung mit Mobile Development (React Native oder native Entwicklung) von Vorteil',
        'Hohe Ansprüche an Code-Qualität, Testbarkeit und Dokumentation',
        'Eigeninitiative, Kreativität und Spaß an der Arbeit im Team'
      ]
    }
  ];

  return (
    <div className="bg-background text-foreground min-h-screen">
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
      
      <ClassicNav 
        items={navItems} 
        logo={<img src={eloyoLogo} alt="Eloyo Logo" className="h-10 w-auto" />} 
      />

      {/* Hero Section */}
      <section className="relative z-10 pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground">
              Werde Teil von{' '}
              <span className="bg-gradient-primary bg-clip-text text-transparent">Eloyo</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Wir bauen die Zukunft der Kundenbindung für lokale Geschäfte. 
              Arbeite mit uns an einem Produkt, das echten Mehrwert für tausende Händler und Millionen Kunden schafft.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Was dich bei uns erwartet
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <GlassCard className="h-full">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-1">
                        {benefit.title}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Offene Positionen
            </h2>
            <p className="text-lg text-muted-foreground">
              Finde die passende Stelle und bewirb dich noch heute
            </p>
          </motion.div>

          <div className="space-y-8">
            {jobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <GlassCard className="overflow-hidden">
                  {/* Job Header */}
                  <div className="border-b border-border pb-6 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold text-foreground">
                          {job.title} <span className="text-muted-foreground font-normal">{job.subtitle}</span>
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-4 w-4" />
                            {job.type}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-muted-foreground mt-4">
                      {job.description}
                    </p>
                  </div>

                  {/* Tasks */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-foreground mb-3">Deine Aufgaben</h4>
                    <ul className="space-y-2">
                      {job.tasks.map((task, i) => (
                        <li key={i} className="flex items-start gap-3 text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Requirements */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-foreground mb-3">Dein Profil</h4>
                    <ul className="space-y-2">
                      {job.requirements.map((req, i) => (
                        <li key={i} className="flex items-start gap-3 text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Apply Button */}
                  <div className="pt-4 border-t border-border">
                    <Button
                      onClick={() => window.location.href = 'mailto:jobs@eloyo.de?subject=Bewerbung: ' + job.title}
                      className="bg-gradient-primary text-primary-foreground hover:shadow-glow"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Jetzt bewerben
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Info */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <GlassCard className="text-center p-8">
              <Coffee className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Interesse geweckt?
              </h2>
              <p className="text-muted-foreground mb-6">
                Sende uns deine Bewerbung mit Lebenslauf, kurzem Motivationsschreiben, 
                deinem frühestmöglichen Eintrittstermin und deiner Gehaltsvorstellung an:
              </p>
              <a 
                href="mailto:jobs@eloyo.de" 
                className="inline-flex items-center gap-2 text-xl font-semibold text-primary hover:underline"
              >
                <Mail className="h-5 w-5" />
                jobs@eloyo.de
              </a>
              <p className="text-sm text-muted-foreground mt-6">
                Wir freuen uns darauf, dich kennenzulernen!
              </p>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground text-sm">
          <p>© {new Date().getFullYear()} Eloyo. Alle Rechte vorbehalten.</p>
        </div>
      </footer>
    </div>
  );
};

export default Karriere;

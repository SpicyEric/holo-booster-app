import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Particles from "@/components/Particles";
import ClassicNav from "@/components/ClassicNav";
import { GradientButton } from "@/components/GradientButton";
import { motion } from "framer-motion";
import { Star, Gift, MessageSquare, Shield, TrendingUp, Smartphone, QrCode, Trophy, Heart, CheckCircle, Mail } from "lucide-react";
import heroImage from "@/assets/hero-person-qr.jpg";
import productImage from "@/assets/qr-stand-product.png";

const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      navigate("/auth");
    } else if (hash.includes("type=signup")) {
      navigate("/auth");
    }
  }, [navigate]);

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Kontakt", href: "/kontakt" },
    { label: "Impressum", href: "/impressum" },
    { label: "Datenschutz", href: "/datenschutz" },
  ];

  const features = [
    {
      icon: Star,
      title: "Mehr Google-Bewertungen",
      description: "Kunden scannen deinen QR-Code, geben sofort eine Bewertung ab – du bekommst mehr Sichtbarkeit auf Google Maps"
    },
    {
      icon: Gift,
      title: "Digitale Stempelkarte",
      description: "Belohnungen nach X Besuchen, perfekte Kundenbindung – jeder Kunde hat sie immer im Handy dabei"
    },
    {
      icon: MessageSquare,
      title: "SMS-Kampagnen",
      description: "Aktionen & Events per SMS – ruhige Zeiten füllen, automatisierte Umsatzimpulse"
    },
    {
      icon: Shield,
      title: "Negative Bewertungen löschen lassen",
      description: "Professioneller Löschservice mit erfolgsbasierter Abrechnung und sehr hoher Löschquote"
    }
  ];

  const steps = [
    {
      number: "1",
      title: "QR-Code scannen",
      description: "Aufsteller am Tisch, Tresen oder Kassenbereich"
    },
    {
      number: "2",
      title: "Google-Bewertung hinterlassen",
      description: "Mehr echte Bewertungen → mehr Reichweite bei Google Maps"
    },
    {
      number: "3",
      title: "Handynummer eingeben",
      description: "DSGVO-konformes Eintragen auf deiner QRait-Seite"
    },
    {
      number: "4",
      title: "Geschenk + digitale Stempelkarte",
      description: "Einmaliges Geschenk + Start der Kundenkarte, die immer dabei ist"
    },
    {
      number: "5",
      title: "SMS-Marketing für mehr Umsatz",
      description: "Aktionen, Events, Reaktivierungen – direkt aufs Handy der Kunden"
    }
  ];

  const benefits = [
    {
      icon: TrendingUp,
      title: "Mehr Sichtbarkeit auf Google Maps",
      description: "Du erscheinst weiter oben in lokalen Suchergebnissen"
    },
    {
      icon: Star,
      title: "Bessere Sternebewertung",
      description: "Mehr positive Kunden, weniger negative Einträge"
    },
    {
      icon: Heart,
      title: "Stärkere Kundenbindung",
      description: "Wiederkehrende Kunden durch die digitale Stempelkarte"
    },
    {
      icon: Smartphone,
      title: "SMS-Marketing wie große Unternehmen",
      description: "Automatisierte Umsätze durch Aktionen & Events"
    },
    {
      icon: QrCode,
      title: "Einfache Integration ohne Technikstress",
      description: "QR-Codes, Vorlagen, Setup – alles fertig eingerichtet"
    },
    {
      icon: Shield,
      title: "Professioneller Löschservice",
      description: "Wir kümmern uns um ungerechte oder falsche Bewertungen"
    }
  ];

  const deletionFeatures = [
    {
      icon: Trophy,
      title: "Hohe Löschquote",
      description: "Viele negative Bewertungen lassen sich entfernen"
    },
    {
      icon: CheckCircle,
      title: "Erfolgsbasiertes Preismodell",
      description: "Bezahlt wird nur bei erfolgreicher Löschung"
    },
    {
      icon: Star,
      title: "Ideal kombinierbar",
      description: "Perfekt mit Bewertungs-Boost kombinierbar"
    }
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <Particles className="absolute inset-0" />
      
      <ClassicNav 
        logo={
          <div className="flex items-center gap-2">
            <img src="/qrait-logo.svg" alt="QRait Logo" className="h-8 w-8" />
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">QRait</span>
          </div>
        }
        items={navItems}
      />

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-4 pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold mb-6 leading-tight">
              Mehr Google-Bewertungen & Stammkunden durch ein einziges QR-System
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground mb-8">
              QRait kombiniert Bewertungs-Boost, digitale Stempelkarte, SMS-Marketing und einen professionellen Löschservice für negative Bewertungen – speziell für lokale Unternehmen.
            </p>
            <GradientButton onClick={() => navigate("/kontakt")}>
              Kontakt aufnehmen
            </GradientButton>
            <div className="mt-8 space-y-2">
              <p className="text-sm text-muted-foreground">
                Perfekt für Cafés · Friseure · Beauty-Salons · Fitness-Studios · Bäckereien · Restaurants
              </p>
              <p className="text-xs text-muted-foreground font-semibold">
                DSGVO-konform
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <img
              src={heroImage}
              alt="QRait Gründer"
              className="w-full h-auto rounded-2xl shadow-glow"
            />
          </motion.div>
        </div>
      </section>

      {/* Was ist QRait Section */}
      <section className="relative z-10 py-16 lg:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl lg:text-4xl font-bold text-center mb-12"
          >
            Was QRait für dein Geschäft erledigt
          </motion.h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card p-6 rounded-xl shadow-card hover:shadow-glow transition-all duration-300"
              >
                <feature.icon className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* So funktioniert's Section */}
      <section className="relative z-10 py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl lg:text-4xl font-bold text-center mb-12"
          >
            So läuft der Prozess für deine Kunden ab
          </motion.h2>
          
          <div className="max-w-4xl mx-auto space-y-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-6 items-start"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                  {step.number}
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Deine Vorteile Section */}
      <section className="relative z-10 py-16 lg:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl lg:text-4xl font-bold text-center mb-12"
          >
            Deine Vorteile mit QRait
          </motion.h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card p-6 rounded-xl shadow-card hover:shadow-glow transition-all duration-300"
              >
                <benefit.icon className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Negative Bewertungen löschen Section */}
      <section className="relative z-10 py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">
                Ungerechte oder falsche Google-Bewertungen? Wir kümmern uns darum.
              </h2>
              <p className="text-lg text-muted-foreground">
                Wir prüfen negative Bewertungen juristisch, sachlich und technisch. Viele Bewertungen lassen sich entfernen. 
                Bezahlt wird nur bei erfolgreicher Löschung – fair, transparent und auf Erfolgsbasis.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {deletionFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card p-6 rounded-xl shadow-card text-center hover:shadow-glow transition-all duration-300"
                >
                  <feature.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* QRait in deinem Geschäft Section */}
      <section className="relative z-10 py-16 lg:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">
                So sieht QRait in deinem Geschäft aus
              </h2>
              <p className="text-lg text-muted-foreground">
                Der QR-Aufsteller macht den gesamten Prozess für deine Kunden einfach, logisch und schnell.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="order-1 lg:order-2"
            >
              <img
                src={productImage}
                alt="QR-Tischaufsteller"
                className="w-full h-auto rounded-2xl shadow-glow hover:scale-105 transition-transform duration-300"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Bereit für mehr Bewertungen und Stammkunden?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Wir melden uns persönlich bei dir, erklären dir das System und führen dich durch die ersten Schritte.
            </p>
            <GradientButton onClick={() => navigate("/kontakt")} icon={Mail}>
              Kontakt aufnehmen
            </GradientButton>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-8 mt-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <img src="/qrait-logo.svg" alt="QRait Logo" className="h-8 w-8" />
              <span className="text-lg font-bold">QRait</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 QRait. Alle Rechte vorbehalten.
            </p>
            <div className="flex gap-6">
              <a href="/impressum" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Impressum
              </a>
              <a href="/datenschutz" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Datenschutz
              </a>
              <a href="/kontakt" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Kontakt
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

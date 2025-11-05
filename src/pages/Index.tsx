import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { CircularProgress } from "@/components/CircularProgress";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, QrCode, LineChart, Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background p-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16 pt-12"
      >
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          className="inline-block mb-6"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-primary animate-pulse-glow mx-auto" />
        </motion.div>
        
        <h1 className="text-6xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
          Google Review Manager
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Moderne Bewertungs- und Kontaktverwaltung mit QR-Codes, Gutscheinen und Statistiken
        </p>
      </motion.div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <GlassCard>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4 animate-pulse-glow">
              <QrCode className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">QR-Generator</h3>
            <p className="text-sm text-muted-foreground">
              Erstelle individuelle QR-Codes für jeden Standort
            </p>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4 animate-pulse-glow">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Gutscheine</h3>
            <p className="text-sm text-muted-foreground">
              Animierte Gutschein-Karten mit 5-Min-Gültigkeit
            </p>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4 animate-pulse-glow">
              <LineChart className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Statistiken</h3>
            <p className="text-sm text-muted-foreground">
              Kumulative Kurven und Zeitanalysen
            </p>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4 animate-pulse-glow">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">DSGVO</h3>
            <p className="text-sm text-muted-foreground">
              Self-Service Widerruf und Datenschutz
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Demo Progress Circles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <GlassCard className="flex items-center justify-center p-12">
          <CircularProgress value={67} label="67%" subLabel="Conversion" />
        </GlassCard>
        
        <GlassCard className="flex items-center justify-center p-12">
          <CircularProgress value={85} label="85" subLabel="Neue Kontakte" />
        </GlassCard>
      </div>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center mt-16"
      >
        <GradientButton onClick={() => navigate('/auth')} icon={Sparkles}>
          Admin/Merchant Login
        </GradientButton>
        <p className="text-sm text-muted-foreground mt-4">
          DSGVO-konforme Review-Verwaltung powered by Lovable Cloud
        </p>
      </motion.div>
    </div>
  );
};

export default Index;

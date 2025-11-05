import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { Sparkles, Star } from "lucide-react";
import { motion } from "framer-motion";
import { CircularProgress } from "@/components/CircularProgress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const contactSchema = z.object({
  email: z.string().email("Ungültige E-Mail").optional().or(z.literal('')),
  phone: z.string().optional(),
}).refine(data => data.email || data.phone, {
  message: "Bitte gib mindestens E-Mail oder Telefon an",
});

const Scan = () => {
  const { cid } = useParams<{ cid: string }>();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [showVoucher, setShowVoucher] = useState(false);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);
  const [countdown, setCountdown] = useState(900); // 15 min in seconds
  const [voucherCode, setVoucherCode] = useState("");

  useEffect(() => {
    loadCustomer();
  }, [cid]);

  useEffect(() => {
    if (showVoucher && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [showVoucher, countdown]);

  const loadCustomer = async () => {
    if (!cid) {
      console.error('No customer ID provided');
      setLoading(false);
      return;
    }
    
    console.log('Loading customer with ID:', cid);
    setLoading(true);
    
    try {
      const { data, error } = await (supabase as any)
        .from('customers')
        .select('*')
        .eq('id', cid)
        .eq('active', true)
        .maybeSingle();

      if (error) {
        console.error('Error loading customer:', error);
        toast.error("Fehler beim Laden des Kunden");
        setLoading(false);
        return;
      }

      if (!data) {
        console.error('Customer not found for ID:', cid);
        toast.error("Kunde nicht gefunden");
        setLoading(false);
        return;
      }

      console.log('Customer loaded successfully:', data);
      setCustomer(data);
      setLoading(false);
    } catch (err) {
      console.error('Exception loading customer:', err);
      toast.error("Fehler beim Laden");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = contactSchema.safeParse({ email, phone });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    if (!optIn) {
      toast.error("Bitte stimme der Datenverarbeitung zu");
      return;
    }

    if (!customer) return;

    try {
      // Call edge function to capture contact and generate voucher
      const { data, error } = await supabase.functions.invoke('publicCaptureContact', {
        body: {
          customerId: cid,
          email: email || null,
          phone: phone || null,
          optIn: true,
        },
      });

      if (error) {
        console.error('Error capturing contact:', error);
        toast.error('Fehler beim Erstellen des Gutscheins');
        return;
      }

      console.log('Voucher response:', data);
      setVoucherCode(data.voucherCode);
      setShowReviewPrompt(true);
      setCountdown(900); // Reset countdown to 15 minutes
      toast.success('Bitte bewerte uns jetzt bei Google!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Fehler beim Erstellen des Gutscheins');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-gradient-primary animate-pulse-glow" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <GlassCard>
          <p className="text-xl text-center">Kunde nicht gefunden</p>
        </GlassCard>
      </div>
    );
  }

  const handleRedeemConfirm = async () => {
    try {
      const { error } = await supabase
        .from('claims')
        .update({ redeemed_at: new Date().toISOString() })
        .eq('code', voucherCode);
      
      if (error) {
        toast.error('Fehler beim Einlösen');
        return;
      }
      
      toast.success('Vielen Dank für deine Unterstützung. Wir hoffen, wir konnten dir hiermit auch eine Freude machen! 🎉', {
        duration: 5000,
      });
      setShowRedeemDialog(false);
      setShowVoucher(false);
    } catch (err) {
      toast.error('Fehler beim Einlösen');
    }
  };

  if (showReviewPrompt) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md"
        >
          <GlassCard className="text-center">
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl mb-6"
            >
              🎉
            </motion.div>
            
            <h2 className="text-3xl font-bold mb-4">Fast geschafft!</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Bitte hinterlasse uns jetzt eine ehrliche Bewertung bei Google, 
              um deinen Gutschein zu erhalten
            </p>

            <GradientButton
              onClick={() => {
                window.open(customer.google_review_url, '_blank');
                // Show voucher after 3 seconds
                setTimeout(() => {
                  setShowReviewPrompt(false);
                  setShowVoucher(true);
                }, 3000);
              }}
              icon={Star}
              className="w-full"
            >
              Jetzt bei Google bewerten
            </GradientButton>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  if (showVoucher) {
    const progress = (countdown / 900) * 100;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md"
        >
          <GlassCard className="text-center">
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                filter: ["brightness(1)", "brightness(1.2)", "brightness(1)"]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="mb-6">
                <CircularProgress 
                  value={progress} 
                  label={formatTime(countdown)}
                  subLabel="verbleibend"
                  size={180}
                />
              </div>

              <h2 className="text-3xl font-bold mb-2">Dein Gutschein</h2>
              <p className="text-muted-foreground mb-6">{customer.offer_text}</p>

              <div className="bg-card/40 rounded-2xl p-6 mb-6">
                <p className="text-sm text-muted-foreground mb-2">Gutschein-Code</p>
                <p className="text-4xl font-bold tracking-wider bg-gradient-primary bg-clip-text text-transparent">
                  {voucherCode}
                </p>
              </div>

              {countdown > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Zeige diesen Code an der Kasse
                  </p>
                  <GradientButton
                    onClick={() => setShowRedeemDialog(true)}
                    className="w-full"
                  >
                    Gutschein einlösen
                  </GradientButton>
                </>
              ) : (
                <p className="text-destructive font-semibold">
                  Gutschein abgelaufen
                </p>
              )}
            </motion.div>
          </GlassCard>
        </motion.div>

        <AlertDialog open={showRedeemDialog} onOpenChange={setShowRedeemDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Gutschein einlösen?</AlertDialogTitle>
              <AlertDialogDescription>
                Hast du den Gutschein bei einem Mitarbeiter eingelöst? 
                Diese Aktion kann nicht rückgängig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Nein, noch nicht</AlertDialogCancel>
              <AlertDialogAction onClick={handleRedeemConfirm}>
                Ja, eingelöst
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
            className="w-16 h-16 rounded-full bg-gradient-primary animate-pulse-glow mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold mb-2">{customer.name}</h1>
          <p className="text-muted-foreground">
            Nur noch 1 Schritt zu deinem Vorteil
          </p>
        </div>

        <GlassCard>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">E-Mail (optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="deine@email.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefon (optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+49 123 456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-2"
              />
            </div>

            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="optin"
                checked={optIn}
                onCheckedChange={(checked) => setOptIn(checked as boolean)}
              />
              <label
                htmlFor="optin"
                className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
              >
                Ich willige ein, von {customer.name} per E-Mail/SMS über Angebote informiert zu werden.
                Ich kann diese Einwilligung jederzeit widerrufen.{' '}
                <a href="#" className="text-primary hover:underline">
                  Datenschutz
                </a>
              </label>
            </div>

            <GradientButton
              type="submit"
              className="w-full"
              icon={Sparkles}
              disabled={!email && !phone}
            >
              Gutschein holen
            </GradientButton>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-4">
            Deine Daten werden DSGVO-konform gespeichert. Du erhältst einen Widerrufslink per E-Mail.
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default Scan;

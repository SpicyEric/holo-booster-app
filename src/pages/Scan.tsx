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
import confetti from "canvas-confetti";
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
  phone: z.string().min(1, "Telefonnummer ist erforderlich"),
});

const Scan = () => {
  const { cid } = useParams<{ cid: string }>();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [showVoucher, setShowVoucher] = useState(false);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);
  const [showStampCard, setShowStampCard] = useState(false);
  const [countdown, setCountdown] = useState(900); // 15 min in seconds
  const [voucherCode, setVoucherCode] = useState("");
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);
  const [stampCount, setStampCount] = useState(0);
  const [newStampIndex, setNewStampIndex] = useState<number | null>(null);

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

  const playStampSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHWi+8OKbTw0PVK3q8K5aFgpEpt/wumojBi+B0/PSfzEGH2e98OGYTg0NUq7r8axaFgpKouHyvW0hBSqBzvPTgjMGIGO88N+STw8OUK/p8atZGApKn+HyvGsfBSl+0PPTgTQGHWW88OCOTQwNUazp77BaGApGnt/xtmwfBSB+yvLUgzUGHGW58N+OTQwKUazp8KxYFwpFm+ButGMeBR1+yfLTgjQGGmS58N+OTQ0KUKrl8KtXFwpDmuLwtWIeCB1+yPHSgzUGGWK48N+OTQ0JUKrl8KpXFwpDmuLwtGIeCBx+x/HSgzUFGGK38N+OTQ0IUKrl8KpXFwpCmOLwtGIeCBx+x/HSgzUFGGG28N+OTQ0IUKnl8KlXFwpBluLwtGIeCBt+x/HRgzUFGGC28N+OTQ0IUKjl8KlWFwpBluHwtGIeCBt+x/HRgzUFGGC18N+OTQ0IUKjl8KlWFwpBleHwtGIeCBt+x/HRgzUFGGC18N+OTQ0IUKjl8KlWFwpBleHwtGIeCBt+x/HRgzUFGGC18N+OTQ0IUKjl8KlWFwpBleHwtGIeCBt+x/HRgzUFGGC18N+OTQ0IUKjl8KlWFwpBleHwtGIeCBt+x/HRgzUFGGC18N+OTQ0IUKjl8KlWFwpBleHwtGIeCBt+x/HRgzUFGGC18N+OTQ0IUKjl8KlWFwpBleHwtGIeCBt+x/HRgzUFGGC18N+OTQ0IUKjl8KlWFwpBleHwtGIeCBt+x/HRgzUFGGC18N+OTQ0IUKjl8KlWFwpBleHwtGIeCBt+x/HRgzUFGGC18N+OTQ0IUKjl8KlWFwo=');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (err) {
      console.log('Could not play sound:', err);
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF6347']
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = contactSchema.safeParse({ phone });
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
      const { data, error } = await supabase.functions.invoke('publicCaptureContact', {
        body: {
          customerId: cid,
          phone: phone,
          optIn: true,
        },
      });

      if (error) {
        console.error('Error capturing contact:', error);
        toast.error(error.message || 'Fehler beim Verarbeiten');
        return;
      }

      console.log('Response:', data);
      
      // Check if returning customer (stamp card user)
      if (data.isReturningCustomer) {
        setIsReturningCustomer(true);
        setStampCount(data.stampCount);
        
        // Already scanned today
        if (data.alreadyScannedToday) {
          setShowStampCard(true);
          toast.info('Du hast heute schon gescannt! 😊', {
            description: 'Komm morgen wieder für einen weiteren Stempel.',
          });
          return;
        }
        
        // Check if stamp card is complete
        if (data.stampCardComplete) {
          triggerConfetti();
          setVoucherCode(data.voucherCode);
          setShowVoucher(true);
          setCountdown(900);
          toast.success('Glückwunsch! Deine Stempelkarte ist voll! 🎉');
        } else {
          // New stamp added
          playStampSound();
          setNewStampIndex(data.stampCount - 1);
          setShowStampCard(true);
          toast.success(`Stempel erhalten! ${data.stampCount}/${customer.stamps_required}`, {
            description: `Noch ${customer.stamps_required - data.stampCount} bis zur Belohnung!`,
          });
        }
      } else {
        // First time visitor - show review prompt
        setVoucherCode(data.voucherCode);
        setShowReviewPrompt(true);
        setCountdown(900);
        toast.success('Bitte bewerte uns jetzt bei Google!');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Fehler beim Verarbeiten');
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
      
      toast.success('Vielen Dank! 🎉', {
        description: isReturningCustomer 
          ? 'Du kannst jetzt weiter Stempel sammeln!' 
          : 'Ab jetzt kannst du Stempel sammeln für weitere Belohnungen!',
        duration: 5000,
      });
      
      setShowRedeemDialog(false);
      
      // Show stamp card after redeeming if first-time customer
      if (!isReturningCustomer) {
        setTimeout(() => {
          setShowVoucher(false);
          setShowStampCard(true);
          setStampCount(0);
        }, 2000);
      } else {
        setShowVoucher(false);
      }
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

  if (showStampCard) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md"
        >
          <GlassCard className="text-center">
            {customer.logo_url && (
              <div className="mb-6">
                <img 
                  src={customer.logo_url} 
                  alt={customer.name}
                  className="w-24 h-24 object-contain mx-auto rounded-lg"
                />
              </div>
            )}
            
            <h2 className="text-3xl font-bold mb-2">Deine Stempelkarte</h2>
            <p className="text-muted-foreground mb-6">{customer.name}</p>

            <div className="grid grid-cols-5 gap-3 mb-6">
              {Array.from({ length: customer.stamps_required || 5 }).map((_, i) => {
                const isNewStamp = i === newStampIndex;
                const isFilled = i < stampCount;
                
                return (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ 
                      scale: isNewStamp ? [0, 1.3, 1] : 1,
                      rotate: isNewStamp ? [0, 10, -10, 0] : 0
                    }}
                    transition={{ 
                      delay: i * 0.1,
                      duration: isNewStamp ? 0.8 : 0.3,
                    }}
                    className={`aspect-square rounded-xl flex items-center justify-center text-3xl
                      ${isFilled
                        ? 'bg-gradient-primary shadow-elegant' 
                        : 'bg-card/40 border-2 border-border'
                      }`}
                  >
                    {isFilled && (
                      <motion.span
                        initial={isNewStamp ? { scale: 0, rotate: -45 } : false}
                        animate={isNewStamp ? { scale: 1, rotate: 0 } : false}
                        transition={{ delay: 0.2 }}
                      >
                        ✓
                      </motion.span>
                    )}
                  </motion.div>
                );
              })}
            </div>

            <div className="bg-card/40 rounded-2xl p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-1">Stempel gesammelt</p>
              <p className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {stampCount} / {customer.stamps_required || 5}
              </p>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {customer.stamps_required - stampCount === 1 
                ? 'Noch 1 Stempel bis zur Belohnung!' 
                : `Noch ${customer.stamps_required - stampCount} Stempel bis zur Belohnung!`}
            </p>

            <div className="bg-accent/20 rounded-xl p-4">
              <p className="text-sm font-medium">Deine Belohnung:</p>
              <p className="text-lg font-bold text-primary">{customer.stamp_reward_text || 'Gratis Kaffee'}</p>
            </div>
          </GlassCard>
        </motion.div>
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
          {customer.logo_url ? (
            <motion.img
              src={customer.logo_url}
              alt={customer.name}
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
              className="w-24 h-24 object-contain mx-auto mb-4 rounded-lg"
            />
          ) : (
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
              className="w-16 h-16 rounded-full bg-gradient-primary animate-pulse-glow mx-auto mb-4"
            />
          )}
          <h1 className="text-3xl font-bold mb-2">{customer.name}</h1>
          <p className="text-muted-foreground">
            {customer.offer_title || 'Nur noch 1 Schritt zu deinem Vorteil'}
          </p>
        </div>

        <GlassCard>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="phone">Handynummer *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+49 123 456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-2"
                required
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
                Ich willige ein, von {customer.name} per SMS über Angebote informiert zu werden.
                Ich kann diese Einwilligung jederzeit widerrufen.{' '}
                <a href="/datenschutz" className="text-primary hover:underline">
                  Datenschutz
                </a>
              </label>
            </div>

            <GradientButton
              type="submit"
              className="w-full"
              icon={Sparkles}
              disabled={!phone || !optIn}
            >
              Weiter
            </GradientButton>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-4">
            Deine Daten werden DSGVO-konform gespeichert.
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default Scan;

import { useState, useEffect } from 'react';
import ClassicNav from '@/components/ClassicNav';
import Particles from '@/components/Particles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2, Shield, CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import loyoLogo from '@/assets/loyo-logo.png';

const Delete = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [deleted, setDeleted] = useState(false);
  const token = searchParams.get('t');

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Kontakt', href: '/kontakt' },
    { label: 'Datenschutz', href: '/datenschutz' },
    { label: 'Impressum', href: '/impressum' },
    { label: 'Login', href: '/auth' },
  ];

  useEffect(() => {
    // Auto-delete if token is present
    if (token && !deleted) {
      handleTokenDelete();
    }
  }, [token]);

  const handleTokenDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('deleteContactByToken', {
        body: { token }
      });

      if (error) throw error;

      setDeleted(true);
      toast.success('Ihre Daten wurden erfolgreich gelöscht');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Ein Fehler ist aufgetreten. Bitte kontaktieren Sie uns direkt.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone) {
      toast.error('Bitte geben Sie Ihre Telefonnummer ein');
      return;
    }

    setLoading(true);
    try {
      // Note: This would require implementing a phone-based lookup
      toast.info('Bitte verwenden Sie den Link aus unserer E-Mail für die Datenlöschung');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  if (deleted) {
    return (
      <div className="min-h-screen bg-background">
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
          logo={<img src={loyoLogo} alt="Loyo Logo" className="h-10 w-auto" />}
        />

        <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-primary mx-auto mb-6 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-4">Daten erfolgreich gelöscht</h1>
              <p className="text-muted-foreground mb-8">
                Ihre personenbezogenen Daten wurden vollständig aus unserem System entfernt.
              </p>
              <Button onClick={() => window.location.href = '/'} className="bg-foreground text-background hover:bg-foreground/90">
                Zur Startseite
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
        logo={<img src={loyoLogo} alt="Loyo Logo" className="h-10 w-auto" />}
      />

      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-20 h-20 rounded-full bg-gradient-primary mx-auto mb-6 flex items-center justify-center">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold mb-4">Datenlöschung</h1>
            <p className="text-xl text-muted-foreground">
              Gemäß DSGVO Art. 17 - Recht auf Vergessenwerden
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <Trash2 className="w-6 h-6 mr-2 text-primary" />
              Ihre Daten löschen
            </h2>

            {token ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-6">
                  Ihre Löschanfrage wird bearbeitet...
                </p>
                {loading && (
                  <div className="w-16 h-16 rounded-full bg-gradient-primary animate-pulse mx-auto" />
                )}
              </div>
            ) : (
              <div>
                <p className="text-muted-foreground mb-6">
                  Um Ihre Daten zu löschen, verwenden Sie bitte den Link, den Sie per E-Mail erhalten haben.
                  Falls Sie keinen Link haben, können Sie uns auch direkt kontaktieren.
                </p>

                <form onSubmit={handlePhoneDelete} className="space-y-6">
                  <div>
                    <Label htmlFor="phone">Telefonnummer (alternative Methode)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+49 123 456789"
                      className="mt-2"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Hinweis: Für Sicherheitszwecke empfehlen wir die Verwendung des E-Mail-Links.
                    </p>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full bg-foreground text-background hover:bg-foreground/90">
                    {loading ? 'Wird verarbeitet...' : 'Löschung beantragen'}
                  </Button>
                </form>
              </div>
            )}
          </div>

          <div className="bg-muted/50 border border-border rounded-2xl p-6">
            <h3 className="font-semibold mb-3">Was wird gelöscht?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Ihre Telefonnummer</li>
              <li>• Ihre E-Mail-Adresse</li>
              <li>• Alle Scan-Daten und Aktivitäten</li>
              <li>• Alle Einwilligungen und Opt-ins</li>
              <li>• Alle zugehörigen Claims und Geschenke</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4">
              Die Löschung ist endgültig und kann nicht rückgängig gemacht werden.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Delete;

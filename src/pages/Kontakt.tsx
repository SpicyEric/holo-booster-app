import { useState } from 'react';
import PillNav from '@/components/PillNav';
import { DotGrid } from '@/components/DotGrid';
import { GradientButton } from '@/components/GradientButton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Phone, MapPin } from 'lucide-react';
import logo from '@/assets/qrait-logo.svg';

const Kontakt = () => {
  const [loading, setLoading] = useState(false);

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Kontakt', href: '/kontakt' },
    { label: 'Datenschutz', href: '/datenschutz' },
    { label: 'Impressum', href: '/impressum' },
    { label: 'Login', href: '/auth' },
  ];
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    consent: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.consent) {
      toast.error('Bitte akzeptieren Sie die Datenschutzerklärung');
      return;
    }

    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke('contact-submit', {
        body: formData
      });

      if (error) throw error;

      toast.success('Vielen Dank! Wir melden uns in Kürze bei Ihnen.');
      setFormData({ name: '', email: '', phone: '', message: '', consent: false });
    } catch (error) {
      console.error('Contact form error:', error);
      toast.error('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DotGrid />
      <div className="fixed top-0 left-0 right-0 flex justify-center z-50">
        <PillNav
          logo={logo}
          logoAlt="QRAIT Logo"
          items={navItems}
          baseColor="#0a0a0a"
          pillColor="#ffffff"
          hoveredPillTextColor="#ffffff"
          pillTextColor="#0a0a0a"
        />
      </div>

      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-4">
              Kontaktieren Sie uns
            </h1>
            <p className="text-xl text-muted-foreground">
              Wir freuen uns auf Ihre Nachricht
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-card border border-border rounded-2xl p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ihr Name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">E-Mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ihre@email.de"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Telefon (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+49 123 456789"
                  />
                </div>

                <div>
                  <Label htmlFor="message">Nachricht *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Ihre Nachricht an uns..."
                    rows={6}
                    required
                  />
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="consent"
                    checked={formData.consent}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, consent: checked as boolean })
                    }
                  />
                  <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
                    Ich habe die{' '}
                    <a href="/datenschutz" className="text-primary hover:underline">
                      Datenschutzerklärung
                    </a>{' '}
                    gelesen und stimme der Verarbeitung meiner Daten zu. *
                  </Label>
                </div>

                <GradientButton type="submit" disabled={loading} className="w-full">
                  {loading ? 'Wird gesendet...' : 'Nachricht senden'}
                </GradientButton>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              <div className="bg-card border border-border rounded-2xl p-8">
                <h2 className="text-2xl font-bold mb-6">Kontaktinformationen</h2>
                
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">E-Mail</h3>
                      <a href="mailto:info@qrait.de" className="text-muted-foreground hover:text-foreground transition-colors">
                        info@qrait.de
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Telefon</h3>
                      <a href="tel:+491234567890" className="text-muted-foreground hover:text-foreground transition-colors">
                        +49 123 456 7890
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Adresse</h3>
                      <p className="text-muted-foreground">
                        QRAIT GmbH<br />
                        Musterstraße 123<br />
                        12345 Musterstadt
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-8">
                <h3 className="text-xl font-bold mb-4">Geschäftszeiten</h3>
                <div className="space-y-2 text-muted-foreground">
                  <p><span className="font-medium text-foreground">Mo - Fr:</span> 09:00 - 18:00 Uhr</p>
                  <p><span className="font-medium text-foreground">Sa - So:</span> Geschlossen</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Kontakt;

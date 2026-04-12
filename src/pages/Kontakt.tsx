import { useState } from 'react';
import PageLayout, { glassReveal, viewportConfig } from '@/components/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { motion } from 'framer-motion';

const Kontakt = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    consent: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.consent) { toast.error('Bitte akzeptieren Sie die Datenschutzerklärung'); return; }
    if (!formData.name || !formData.email || !formData.message) { toast.error('Bitte füllen Sie alle Pflichtfelder aus'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from('contact_submissions' as any).insert({
        name: formData.name, email: formData.email, phone: formData.phone || null, message: formData.message,
      } as any);
      if (error) throw error;
      toast.success('Vielen Dank! Wir melden uns in Kürze bei Ihnen.');
      setFormData({ name: '', email: '', phone: '', message: '', consent: false });
    } catch (error) {
      console.error('Contact form error:', error);
      toast.error('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
    } finally { setLoading(false); }
  };

  return (
    <PageLayout>
      <section className="relative z-10 pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={glassReveal} initial="hidden" animate="visible" className="text-center mb-16">
            <h1 className="font-headline text-4xl sm:text-5xl font-extrabold tracking-[-0.02em] mb-4">
              Kontaktieren Sie uns
            </h1>
            <p className="text-lg text-[#4a4455]">Wir freuen uns auf Ihre Nachricht</p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <motion.div variants={glassReveal} initial="hidden" whileInView="visible" viewport={viewportConfig}>
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="name" className="text-[#1a1b21]">Name *</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ihr Name" required className="bg-[#f9f8fc] border-[#eeedf5]" />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-[#1a1b21]">E-Mail *</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="ihre@email.de" required className="bg-[#f9f8fc] border-[#eeedf5]" />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-[#1a1b21]">Telefon (optional)</Label>
                    <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+49 123 456789" className="bg-[#f9f8fc] border-[#eeedf5]" />
                  </div>
                  <div>
                    <Label htmlFor="message" className="text-[#1a1b21]">Nachricht *</Label>
                    <Textarea id="message" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="Ihre Nachricht an uns..." rows={6} required className="bg-[#f9f8fc] border-[#eeedf5]" />
                  </div>
                  <div className="flex items-start space-x-2">
                    <Checkbox id="consent" checked={formData.consent} onCheckedChange={(checked) => setFormData({ ...formData, consent: checked as boolean })} />
                    <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer text-[#4a4455]">
                      Ich habe die <a href="/datenschutz" className="text-primary hover:underline">Datenschutzerklärung</a> gelesen und stimme der Verarbeitung meiner Daten zu. *
                    </Label>
                  </div>
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                    <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-blue-500 text-white hover:shadow-[0_10px_30px_rgba(124,58,237,0.2)]">
                      {loading ? 'Wird gesendet...' : 'Nachricht senden'}
                      <Send className="ml-2 w-4 h-4" />
                    </Button>
                  </motion.div>
                </form>
              </div>
            </motion.div>

            {/* Contact Info */}
            <motion.div variants={glassReveal} initial="hidden" whileInView="visible" viewport={viewportConfig} className="space-y-8">
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <h2 className="font-headline text-2xl font-bold mb-6">Kontaktinformationen</h2>
                <div className="space-y-6">
                  {[
                    { icon: Mail, label: 'E-Mail', content: <a href="mailto:support@eloyo.de" className="text-[#4a4455] hover:text-primary transition-colors">support@eloyo.de</a> },
                    { icon: Phone, label: 'Telefon', content: <a href="tel:+4915162665596" className="text-[#4a4455] hover:text-primary transition-colors">+49 151 62665596</a> },
                    { icon: MapPin, label: 'Adresse', content: <p className="text-[#4a4455]">Eloyo<br />Fuggerstr. 2<br />86836 Untermeitingen</p> },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-headline font-semibold mb-1">{item.label}</h3>
                        {item.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <h3 className="font-headline text-xl font-bold mb-4">Ansprechpartner</h3>
                <p className="text-[#4a4455] mb-6">Klaus Eric Pfadisch</p>
                <h3 className="font-headline text-xl font-bold mb-4">Geschäftszeiten</h3>
                <div className="space-y-2 text-[#4a4455] mb-6">
                  <p><span className="font-medium text-[#1a1b21]">Mo - Fr:</span> 09:00 - 18:00 Uhr</p>
                  <p><span className="font-medium text-[#1a1b21]">Sa - So:</span> Geschlossen</p>
                </div>
                <h3 className="font-headline text-xl font-bold mb-4">Folgen Sie uns</h3>
                <a href="https://instagram.com/eloyo.de" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[#4a4455] hover:text-primary transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  @eloyo.de
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Kontakt;

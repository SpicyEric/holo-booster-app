import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/app/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, HeadphonesIcon, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const categories = [
  { value: 'bug', label: 'Fehler / Bug melden' },
  { value: 'question', label: 'Frage zur App' },
  { value: 'feedback', label: 'Feedback / Verbesserungsvorschlag' },
  { value: 'other', label: 'Sonstiges' },
];

export default function AppSupport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !category || !message.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('support_messages' as any)
        .insert({
          user_id: user.id,
          category,
          message: message.trim(),
        } as any);

      if (error) throw error;
      setSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting support message:', error);
      toast.error('Fehler beim Absenden. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <MainLayout title="Support & Hilfe" showBack>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Nachricht gesendet!</h2>
          <p className="text-muted-foreground mb-8 max-w-xs">
            Vielen Dank für deine Nachricht. Unser Team wird sich so schnell wie möglich darum kümmern.
          </p>
          <Button
            onClick={() => navigate('/app')}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            Zurück zur Startseite
          </Button>
        </motion.div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Support & Hilfe" showBack>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <HeadphonesIcon className="h-7 w-7 text-primary" />
            </div>
            <CardTitle>Wie können wir helfen?</CardTitle>
            <CardDescription>
              Beschreibe dein Anliegen und wir melden uns bei dir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Kategorie *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Was beschreibt dein Anliegen?" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Deine Nachricht *</Label>
                <Textarea
                  id="message"
                  placeholder="Beschreibe dein Anliegen so genau wie möglich..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  required
                />
                <p className="text-xs text-muted-foreground text-right">
                  {message.length}/2000
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-secondary"
                disabled={loading || !category || !message.trim()}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Nachricht absenden
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

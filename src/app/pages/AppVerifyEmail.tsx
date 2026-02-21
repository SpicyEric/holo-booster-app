import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

export default function AppVerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setErrorMsg('Kein Verifizierungstoken gefunden.');
      return;
    }

    const verify = async () => {
      try {
        const { data, error } = await supabase.rpc('verify_email_token', {
          p_token: token,
        });

        if (error) throw error;

        const result = data as any;
        if (result?.success) {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMsg(result?.error || 'Verifizierung fehlgeschlagen.');
        }
      } catch (err: any) {
        console.error('Verification error:', err);
        setStatus('error');
        setErrorMsg('Ein Fehler ist aufgetreten.');
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex flex-col items-center justify-center p-6">
      <div className="bg-card rounded-2xl p-8 shadow-lg border max-w-sm w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">E-Mail wird verifiziert...</h2>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">E-Mail bestätigt! ✅</h2>
            <p className="text-muted-foreground mb-6">
              Du kannst jetzt alle Funktionen nutzen, einschließlich dem Einlösen von Prämien.
            </p>
            <Button onClick={() => navigate('/app')} className="w-full">
              Zur App
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Verifizierung fehlgeschlagen</h2>
            <p className="text-muted-foreground mb-6">{errorMsg}</p>
            <Button onClick={() => navigate('/app')} variant="outline" className="w-full">
              Zur App
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

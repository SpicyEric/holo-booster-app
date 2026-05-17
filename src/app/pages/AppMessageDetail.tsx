import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Clock, Check, Loader2, Sparkles, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';
import { nfcService } from '@/app/services/nfcService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface MessageDetail {
  id: string;
  title: string;
  body: string;
  sent_at: string | null;
  read_at: string | null;
  offer_id: string | null;
  offer_redeemed_at: string | null;
  image_url: string | null;
  merchant_customer_id: string | null;
  system_type: string | null;
  cta_label: string | null;
  cta_route: string | null;
  customer?: {
    name: string;
    company_name: string | null;
    logo_url: string | null;
  } | null;
  offer?: {
    id: string;
    title: string;
    description: string | null;
    valid_until: string | null;
  } | null;
}

const AppMessageDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [showNfcDialog, setShowNfcDialog] = useState(false);
  const [nfcScanning, setNfcScanning] = useState(false);

  useEffect(() => {
    if (id && user) {
      loadMessage();
      markAsRead();
    }
  }, [id, user]);

  // Stop NFC scan when dialog closes
  useEffect(() => {
    if (!showNfcDialog && nfcScanning) {
      nfcService.stopScan();
      setNfcScanning(false);
    }
  }, [showNfcDialog]);

  const loadMessage = async () => {
    try {
      const { data: msgData, error: msgError } = await supabase
        .from('app_messages')
        .select(`
          id, title, body, sent_at, read_at, offer_id, offer_redeemed_at, image_url, merchant_customer_id,
          system_type, cta_label, cta_route,
          customers!merchant_customer_id (name, company_name, logo_url, active)
        `)
        .eq('id', id!)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (msgError || !msgData) {
        setLoading(false);
        return;
      }

      const merchantData = Array.isArray((msgData as any).customers)
        ? (msgData as any).customers[0]
        : (msgData as any).customers;

      // Block access to messages from inactive (cancelled) merchants
      // (system messages without merchant are always allowed)
      if ((msgData as any).merchant_customer_id && merchantData?.active !== true) {
        setLoading(false);
        return;
      }

      const msg: any = {
        ...msgData,
        customer: merchantData ?? null,
        offer: null,
      };

      if ((msgData as any).offer_id) {
        const { data: offerData } = await supabase
          .from('offers')
          .select('id, title, description, valid_until')
          .eq('id', (msgData as any).offer_id)
          .maybeSingle();
        
        if (offerData) {
          msg.offer = offerData;
        }
      }

      setMessage(msg as MessageDetail);
    } catch (err) {
      console.error('[MessageDetail] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    if (!id || !user) return;
    await supabase
      .from('app_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .is('read_at', null);
  };

  const isBirthdayBonus = (msg: MessageDetail) => {
    return msg.title.toLowerCase().includes('geburtstag') && 
           msg.offer?.title?.startsWith('🎁 Geburtstags-Bonus');
  };

  const parseBirthdayPoints = (msg: MessageDetail): number => {
    if (!msg.offer?.description) return 0;
    const match = msg.offer.description.match(/(\d+)\s*Punkte/);
    return match ? parseInt(match[1]) : 0;
  };

  const handleClaimBirthdayPoints = async () => {
    if (!message || !user) return;
    
    const points = parseBirthdayPoints(message);
    if (points <= 0) return;

    setRedeeming(true);
    try {
      let { data: account } = await supabase
        .from('loyalty_accounts')
        .select('id, current_points_balance')
        .eq('user_id', user.id)
        .eq('merchant_customer_id', message.merchant_customer_id)
        .maybeSingle();

      if (!account) {
        const { data: newAccount, error: createError } = await supabase
          .from('loyalty_accounts')
          .insert({
            user_id: user.id,
            merchant_customer_id: message.merchant_customer_id,
            current_points_balance: points
          })
          .select('id, current_points_balance')
          .single();
        
        if (createError) throw createError;
        account = newAccount;
      } else {
        const { error: updateError } = await supabase
          .from('loyalty_accounts')
          .update({
            current_points_balance: (account.current_points_balance || 0) + points,
            updated_at: new Date().toISOString()
          })
          .eq('id', account.id);
        
        if (updateError) throw updateError;
      }

      await supabase.from('point_transactions').insert({
        loyalty_account_id: account!.id,
        merchant_customer_id: message.merchant_customer_id,
        points_change: points,
        transaction_type: 'birthday_bonus',
        description: `Geburtstags-Bonus: ${points} Punkte`
      });

      await supabase
        .from('app_messages')
        .update({ offer_redeemed_at: new Date().toISOString() })
        .eq('id', message.id)
        .eq('user_id', user.id);

      toast.success(`🎉 ${points} Punkte gutgeschrieben!`);
      setMessage(prev => prev ? { ...prev, offer_redeemed_at: new Date().toISOString() } : null);
    } catch (err) {
      console.error('[MessageDetail] Error claiming points:', err);
      toast.error('Fehler beim Einlösen');
    } finally {
      setRedeeming(false);
    }
  };

  const handleRedeemOfferClick = () => {
    // Open NFC dialog instead of directly redeeming
    setShowNfcDialog(true);
    startNfcScan();
  };

  const startNfcScan = async () => {
    if (!message || !user) return;
    setNfcScanning(true);

    try {
      await nfcService.startScan(async (result) => {
        setNfcScanning(false);

        if (!result.success) {
          if (result.error && !result.error.includes('abgebrochen')) {
            toast.error(result.error);
          }
          return;
        }

        // Fraud-safe, atomic server-side redemption
        try {
          const { data, error } = await supabase.rpc('redeem_message_offer_via_nfc', {
            p_message_id: message.id,
            p_user_id: user.id,
            p_hardware_uid: result.hardwareUid || null,
          });

          if (error) throw error;

          const response = data as any;
          if (!response?.success) {
            if (response?.error_code === 'already_redeemed') {
              const redeemedAt = response?.offer_redeemed_at || new Date().toISOString();
              setMessage(prev => prev ? { ...prev, offer_redeemed_at: redeemedAt } : null);
              setShowNfcDialog(false);
              toast.info('Dieses Angebot wurde bereits eingelöst.');
              return;
            }

            if (response?.error_code === 'expired_offer') {
              setShowNfcDialog(false);
              toast.error('Diese Prämie ist leider abgelaufen');
              await loadMessage();
              return;
            }

            toast.error(response?.error || 'Fehler beim Einlösen');
            return;
          }

          const redeemedAt = response?.offer_redeemed_at || new Date().toISOString();
          setShowNfcDialog(false);
          toast.success('✅ Angebot eingelöst!');
          setMessage(prev => prev ? { ...prev, offer_redeemed_at: redeemedAt } : null);
        } catch (err) {
          console.error('[MessageDetail] Error redeeming via NFC:', err);
          toast.error('Fehler beim Einlösen');
        }
      });
    } catch (err) {
      console.error('[MessageDetail] NFC scan error:', err);
      setNfcScanning(false);
      toast.error('NFC konnte nicht gestartet werden');
    }
  };

  const getOfferValidity = (validUntil: string | null) => {
    if (!validUntil) return null;
    const end = new Date(validUntil);
    const now = new Date();
    if (end <= now) return { expired: true, text: 'Abgelaufen' };
    
    const days = differenceInDays(end, now);
    const hours = differenceInHours(end, now);
    
    if (days > 0) return { expired: false, text: `Noch ${days} ${days === 1 ? 'Tag' : 'Tage'} gültig` };
    return { expired: false, text: `Noch ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'} gültig` };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!message) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-5 w-5 mr-2" /> Zurück
        </Button>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Nachricht nicht gefunden</p>
        </Card>
      </div>
    );
  }

  const birthdayBonus = isBirthdayBonus(message);
  const birthdayPoints = birthdayBonus ? parseBirthdayPoints(message) : 0;
  const offerValidity = message.offer?.valid_until ? getOfferValidity(message.offer.valid_until) : null;
  const isRedeemed = !!message.offer_redeemed_at;
  const isExpired = offerValidity?.expired ?? false;

  return (
    <div className="bg-background min-h-full">
      {/* Header (sticky inside scroll container so it can't wobble with rubber-band) */}
      <div
        className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center gap-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
      >
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {message.system_type ? (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
        ) : message.customer?.logo_url ? (
          <img src={message.customer.logo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : null}
        <span className="font-semibold text-foreground truncate">
          {message.system_type ? 'Eloyo' : (message.customer?.company_name || message.customer?.name || 'Nachricht')}
        </span>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Message content */}
        <Card className="p-5">
          <h1 className="text-xl font-bold text-foreground mb-2">{message.title}</h1>
          <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed">{message.body}</p>
          {message.image_url && (
            <div className="mt-4 rounded-xl overflow-hidden">
              <img src={message.image_url} alt="" className="w-full object-cover rounded-xl" />
            </div>
          )}
          {message.sent_at && (
            <p className="text-xs text-muted-foreground mt-4">
              {format(new Date(message.sent_at), "dd. MMMM yyyy 'um' HH:mm 'Uhr'", { locale: de })}
            </p>
          )}
          {message.cta_route && message.cta_label && (
            <Button
              onClick={() => navigate(message.cta_route!)}
              className="w-full mt-5 rounded-xl bg-gradient-to-r from-primary to-secondary"
            >
              {message.cta_label}
            </Button>
          )}
        </Card>

        {/* Offer card */}
        {message.offer && (
          <Card className={`p-5 border-2 ${
            isRedeemed 
              ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20' 
              : isExpired 
                ? 'border-gray-200 bg-gray-50/50 dark:bg-gray-900/20 opacity-60'
                : 'border-primary/30 bg-primary/5'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                isRedeemed ? 'bg-green-100 dark:bg-green-900' : 'bg-primary/10'
              }`}>
                {isRedeemed ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : birthdayBonus ? (
                  <Sparkles className="h-5 w-5 text-primary" />
                ) : (
                  <Gift className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground">
                  {birthdayBonus ? `🎁 ${birthdayPoints} Bonus-Punkte` : message.offer.title}
                </h3>
                {message.offer.description && !birthdayBonus && (
                  <p className="text-sm text-muted-foreground mt-1">{message.offer.description}</p>
                )}

                {/* Status badges */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {isRedeemed && (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      <Check className="h-3 w-3 mr-1" /> Eingelöst
                    </Badge>
                  )}
                  {isExpired && !isRedeemed && (
                    <Badge variant="secondary" className="text-muted-foreground">
                      Diese Prämie ist leider abgelaufen
                    </Badge>
                  )}
                  {offerValidity && !offerValidity.expired && !isRedeemed && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      <Clock className="h-3 w-3 mr-1" /> {offerValidity.text}
                    </Badge>
                  )}
                </div>

                {/* Action button */}
                {!isRedeemed && !isExpired && (
                  <div className="mt-4">
                    {birthdayBonus ? (
                      <Button 
                        onClick={handleClaimBirthdayPoints} 
                        disabled={redeeming}
                        className="w-full rounded-xl"
                      >
                        {redeeming ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        {birthdayPoints} Punkte jetzt einlösen
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground text-center">
                          Zeige dieses Angebot im Geschäft und halte die Karte an dein Handy
                        </p>
                        <Button 
                          onClick={handleRedeemOfferClick} 
                          disabled={redeeming}
                          className="w-full rounded-xl"
                        >
                          <Smartphone className="h-4 w-4 mr-2" />
                          Angebot per NFC einlösen
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* NFC Scan Dialog */}
      <Dialog open={showNfcDialog} onOpenChange={setShowNfcDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Angebot einlösen</DialogTitle>
            <DialogDescription className="text-center">
              Halte jetzt die NFC-Karte von {message?.customer?.company_name || message?.customer?.name || 'dem Geschäft'} an dein Handy, um das Angebot einzulösen.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Smartphone className="h-12 w-12 text-primary" />
            </div>
            {nfcScanning ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Warte auf NFC-Karte...</span>
              </div>
            ) : (
              <Button variant="outline" onClick={startNfcScan}>
                Erneut scannen
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppMessageDetail;
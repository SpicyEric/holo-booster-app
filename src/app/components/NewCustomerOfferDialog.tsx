import { Gift, PartyPopper, Sparkles } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface NewCustomerOffer {
  id: string;
  title: string;
  description: string | null;
  bonus_stamps?: number | null;
  merchant_customer_id: string;
}

interface MerchantInfo {
  name: string;
  company_name: string | null;
  logo_url: string | null;
  cover_image_url?: string | null;
  street: string | null;
  house_number: string | null;
  postal_code: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface NewCustomerOfferDialogProps {
  offer: NewCustomerOffer | null;
  merchant: MerchantInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * 'preview' = Kunde hat noch nicht gestempelt → reine Info-Anzeige.
   * 'unlocked' = Kunde hat erstmals Punkte gesammelt → Prämie freigeschaltet, an der Kasse abholen.
   */
  mode?: 'preview' | 'unlocked';
}

export const NewCustomerOfferDialog = ({
  offer,
  merchant,
  open,
  onOpenChange,
  mode = 'preview',
}: NewCustomerOfferDialogProps) => {
  if (!offer || !merchant) return null;

  const merchantName = merchant.company_name || merchant.name;
  const headerImage = merchant.cover_image_url || merchant.logo_url;
  const isUnlocked = mode === 'unlocked';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] rounded-3xl p-0 gap-0 overflow-hidden border-0 [&>button]:hidden">
        {/* Header-Bild (Cover oder Logo als Fallback) */}
        <div
          className="h-32 bg-gradient-to-br from-primary to-primary/60"
          style={
            headerImage
              ? {
                  backgroundImage: `url(${headerImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : undefined
          }
        />

        <div className="px-6 pb-6 -mt-10 text-center">
          {/* Logo zentral */}
          <div className="mx-auto h-16 w-16 rounded-2xl bg-card border-4 border-card shadow-lg overflow-hidden flex items-center justify-center mb-3">
            {merchant.logo_url ? (
              <img
                src={merchant.logo_url}
                alt={merchantName}
                className="h-full w-full object-cover"
              />
            ) : isUnlocked ? (
              <PartyPopper className="h-8 w-8 text-primary" />
            ) : (
              <Gift className="h-8 w-8 text-primary" />
            )}
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            {isUnlocked ? 'Prämie freigeschaltet' : 'Neukundenprämie'}
          </div>

          {/* Titel */}
          <h2 className="text-xl font-bold leading-tight mb-2">
            {isUnlocked ? (
              <>
                Willkommen bei <span className="text-primary">{merchantName}</span> 🎉
              </>
            ) : (
              <>
                Neukundenprämie bei <span className="text-primary">{merchantName}</span>
              </>
            )}
          </h2>

          {/* Erklärtext */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {isUnlocked
              ? 'Hol dir jetzt deine Neukundenprämie an der Kasse ab. Zeig einfach diesen Bildschirm vor.'
              : 'Bei deinem ersten Stempel wird diese Prämie automatisch für dich freigeschaltet. Die Annahme ist freiwillig.'}
          </p>

          {/* Prämien-Box */}
          <div className="rounded-xl bg-primary/10 px-4 py-3 mb-5 text-left">
            <div className="text-xs text-muted-foreground mb-0.5">Deine Prämie</div>
            <div className="text-base font-bold text-primary">{offer.title}</div>
            {offer.description && (
              <div className="text-sm text-foreground/80 mt-1.5 leading-snug">
                {offer.description}
              </div>
            )}
          </div>

          <Button onClick={() => onOpenChange(false)} className="w-full h-11 rounded-xl">
            Alles klar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

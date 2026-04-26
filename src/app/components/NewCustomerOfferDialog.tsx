import { Gift, MapPin, Navigation, PartyPopper, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  const streetWithNumber = [merchant.street, merchant.house_number].filter(Boolean).join(' ');
  const address = [streetWithNumber, merchant.postal_code, merchant.city].filter(Boolean).join(', ');

  const openInMaps = () => {
    if (merchant.latitude && merchant.longitude) {
      window.open(`https://maps.google.com/?q=${merchant.latitude},${merchant.longitude}`, '_blank');
    } else if (address) {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank');
    }
  };

  // ============= UNLOCKED-MODUS: Prämie ist freigeschaltet =============
  if (mode === 'unlocked') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[340px] mx-auto rounded-2xl bg-background/95 backdrop-blur-sm [&>button]:hidden">
          <div className="text-center py-4">
            <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
              <PartyPopper className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-1">
              Willkommen bei {merchantName}!
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Deine Neukundenprämie wurde freigeschaltet 🎉
            </p>

            <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 mb-4 text-left">
              <Badge variant="default" className="mb-2">
                <Gift className="h-3 w-3 mr-1" />Neukundenprämie
              </Badge>
              <p className="font-semibold text-foreground text-base">{offer.title}</p>
              {offer.description && (
                <p className="text-sm text-muted-foreground mt-1">{offer.description}</p>
              )}
            </div>

            <div className="bg-muted rounded-xl p-3 mb-5 text-sm text-muted-foreground">
              Hol dir jetzt deine Prämie an der Kasse ab. Zeig dem Mitarbeiter einfach diesen Bildschirm.
            </div>

            <Button onClick={() => onOpenChange(false)} className="w-full" size="lg">
              Verstanden
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ============= PREVIEW-MODUS: Vor dem ersten Stempel =============
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] mx-auto rounded-2xl bg-background/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Neukundenprämie</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Merchant Logo */}
          <div className="flex justify-center">
            {merchant.logo_url ? (
              <img
                src={merchant.logo_url}
                alt={merchantName}
                className="w-20 h-20 rounded-full object-cover border-4 border-primary/20"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {merchantName.charAt(0)}
              </div>
            )}
          </div>

          {/* Merchant Name & Offer */}
          <div className="text-center">
            <h3 className="text-lg font-bold text-foreground">{merchantName}</h3>
            <p className="text-xl font-bold text-primary mt-2">{offer.title}</p>
          </div>

          {/* Description */}
          {offer.description && (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">{offer.description}</p>
            </div>
          )}

          {/* Info-Hinweis */}
          <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm text-foreground">
                <p className="font-medium mb-1">Bei deinem ersten Stempel</p>
                <p className="text-muted-foreground">
                  wird diese Neukundenprämie automatisch für dich freigeschaltet. Die Annahme ist freiwillig.
                </p>
              </div>
            </div>
          </div>

          {/* Address */}
          {address && (
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Adresse</p>
                  <p className="text-sm text-muted-foreground">{address}</p>
                </div>
                <Button variant="outline" size="sm" onClick={openInMaps}>
                  <Navigation className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full">
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

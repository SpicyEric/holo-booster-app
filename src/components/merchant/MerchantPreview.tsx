import { 
  MapPin, 
  Phone, 
  Globe, 
  Instagram, 
  Facebook, 
  Twitter, 
  Clock, 
  Store,
  Star
} from "lucide-react";

interface OpeningHours {
  [key: string]: { open: string; close: string; closed: boolean };
}

interface MerchantPreviewProps {
  name: string;
  description: string;
  industry: string;
  logo_url: string;
  cover_image_url: string;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  phone: string;
  website: string;
  instagram: string;
  facebook: string;
  twitter: string;
  google_review_url: string;
  opening_hours: OpeningHours;
}

const INDUSTRY_LABELS: Record<string, string> = {
  "cafe": "Café",
  "restaurant": "Restaurant",
  "shishabar": "Shishabar",
  "cbd-shop": "CBD-Shop",
  "baeckerei": "Bäckerei",
  "fashion-store": "Fashion Store",
  "barbershop": "Barbershop",
  "apotheke": "Apotheke",
  "supermarkt": "Supermarkt",
  "reformhaus": "Reformhaus",
  "vegan-restaurant": "Veganes Restaurant",
  "lieferservice": "Lieferservice",
};

const DAY_LABELS: Record<string, string> = {
  monday: "Mo",
  tuesday: "Di",
  wednesday: "Mi",
  thursday: "Do",
  friday: "Fr",
  saturday: "Sa",
  sunday: "So",
};

const MerchantPreview = ({
  name,
  description,
  industry,
  logo_url,
  cover_image_url,
  street,
  house_number,
  postal_code,
  city,
  phone,
  website,
  instagram,
  facebook,
  twitter,
  google_review_url,
  opening_hours,
}: MerchantPreviewProps) => {
  const hasAddress = street || city;
  const hasSocialLinks = phone || website || instagram || facebook || twitter;
  
  // Format today's opening hours
  const getTodayHours = () => {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const today = days[new Date().getDay()];
    const hours = opening_hours[today];
    if (!hours || hours.closed) return "Geschlossen";
    return `${hours.open} - ${hours.close}`;
  };

  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-50 to-slate-100 overflow-y-auto">
      {/* Cover Image */}
      <div className="relative h-32 w-full">
        {cover_image_url ? (
          <img 
            src={cover_image_url} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10" />
        )}
        
        {/* Logo */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
          <div className="w-20 h-20 rounded-full bg-background border-4 border-background shadow-lg overflow-hidden">
            {logo_url ? (
              <img 
                src={logo_url} 
                alt="Logo" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Store className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-12 px-4 pb-4 space-y-4">
        {/* Name & Industry */}
        <div className="text-center">
          <h2 className="text-lg font-bold text-foreground">
            {name || "Geschäftsname"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {INDUSTRY_LABELS[industry] || industry || "Branche"}
          </p>
        </div>

        {/* Points Card */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-4 text-primary-foreground shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-80">Deine Punkte</p>
              <p className="text-2xl font-bold">25</p>
            </div>
            <div className="w-12 h-12 bg-primary-foreground/20 rounded-full flex items-center justify-center">
              <Star className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-2 h-1.5 bg-primary-foreground/20 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-primary-foreground rounded-full" />
          </div>
          <p className="text-xs mt-1 opacity-80">Noch 25 Punkte bis zur Belohnung</p>
        </div>

        {/* Description */}
        {description && (
          <div className="bg-background rounded-lg p-3 shadow-sm">
            <p className="text-xs text-muted-foreground line-clamp-3">
              {description}
            </p>
          </div>
        )}

        {/* Today's Hours */}
        <div className="bg-background rounded-lg p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <div className="flex-1">
              <p className="text-xs font-medium">Heute</p>
              <p className="text-xs text-muted-foreground">{getTodayHours()}</p>
            </div>
          </div>
        </div>

        {/* Opening Hours */}
        <div className="bg-background rounded-lg p-3 shadow-sm">
          <p className="text-xs font-medium mb-2">Öffnungszeiten</p>
          <div className="grid grid-cols-7 gap-1 text-center">
            {Object.entries(DAY_LABELS).map(([key, label]) => {
              const hours = opening_hours[key];
              const isClosed = hours?.closed;
              return (
                <div key={key} className="text-xs">
                  <p className="font-medium text-muted-foreground">{label}</p>
                  <p className={isClosed ? "text-destructive" : "text-foreground"}>
                    {isClosed ? "–" : hours?.open?.slice(0, 5) || "–"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Address */}
        {hasAddress && (
          <div className="bg-background rounded-lg p-3 shadow-sm">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary mt-0.5" />
              <div className="text-xs">
                {street && (
                  <p>{street} {house_number}</p>
                )}
                {(postal_code || city) && (
                  <p className="text-muted-foreground">
                    {postal_code} {city}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Social Links */}
        {hasSocialLinks && (
          <div className="flex items-center justify-center gap-3 py-2">
            {phone && (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Phone className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            {website && (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Globe className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            {instagram && (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Instagram className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            {facebook && (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Facebook className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            {twitter && (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Twitter className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        )}

        {/* Google Review */}
        {google_review_url && (
          <div className="bg-amber-50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <p className="text-xs font-medium text-amber-800">
                Bewertungslink aktiv
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantPreview;

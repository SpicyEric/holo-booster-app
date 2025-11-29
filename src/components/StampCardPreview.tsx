import { useState } from 'react';
import { Gift, Info, Tag, Phone, Globe, Instagram } from 'lucide-react';

// Types for the component props
export interface OpeningHours {
  [day: string]: { open: string; close: string } | null;
}

export interface Reward {
  name: string;
  points: number;
  icon: string;
}

export interface Offer {
  title: string;
  description: string;
  time?: string;
}

export interface StampCardData {
  name: string;
  points: number;
  coverImage?: string;
  address?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  openingHours?: string;
  rewards?: Reward[];
  offers?: Offer[];
}

interface StampCardPreviewProps {
  data: StampCardData;
  onRewardClick?: (reward: Reward) => void;
}

/**
 * StampCardPreview - Reusable loyalty card view component
 * 
 * This is the finalized template for displaying a merchant's stamp card.
 * Use this component consistently across:
 * - Mobile app (when viewing a merchant's stamp card)
 * - Merchant dashboard preview
 * - Any other place where stamp cards need to be displayed
 */
const StampCardPreview = ({ data, onRewardClick }: StampCardPreviewProps) => {
  const [tab, setTab] = useState<'rewards' | 'info' | 'offers'>('rewards');

  const defaultRewards: Reward[] = [
    { name: "Gratis Kaffee", points: 10, icon: "☕" },
    { name: "20% Rabatt", points: 15, icon: "💰" },
    { name: "Gratis Kuchen", points: 20, icon: "🎂" },
  ];

  const defaultOffers: Offer[] = [
    { title: "Happy Hour", description: "2 für 1 auf alle Getränke", time: "14-16 Uhr" },
    { title: "Studentenrabatt", description: "10% mit Ausweis", time: "Täglich" },
  ];

  const rewards = data.rewards || defaultRewards;
  const offers = data.offers || defaultOffers;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Full Cover with Title Overlay */}
      <div className="relative h-44">
        {data.coverImage ? (
          <img 
            src={data.coverImage} 
            alt={data.name} 
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
        )}
        
        {/* Gradient overlay for fade effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        
        {/* Points Badge - Top Right (without star) */}
        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur px-3 py-1.5 rounded-full">
          <span className="text-white font-bold text-sm">{data.points} Punkte</span>
        </div>
        
        {/* Business Name - Overlaying bottom of cover image */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-2">
          <h2 className="font-bold text-xl text-foreground">{data.name}</h2>
        </div>
      </div>
      
      {/* Bottom Sheet Content */}
      <div className="flex-1 flex flex-col">
        {/* Tab Navigation */}
        <div className="flex border-b px-4">
          {[
            { key: 'rewards', icon: Gift, label: 'Prämien' },
            { key: 'info', icon: Info, label: 'Info' },
            { key: 'offers', icon: Tag, label: 'Angebote' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as 'rewards' | 'info' | 'offers')}
              className={`flex-1 flex flex-col items-center gap-1 py-2 transition-all ${
                tab === t.key ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <t.icon className="w-4 h-4" />
              <span className="text-[10px]">{t.label}</span>
            </button>
          ))}
        </div>
        
        {/* Tab Content */}
        <div className="flex-1 p-4 overflow-hidden">
          {/* Rewards Tab */}
          {tab === 'rewards' && (
            <div className="space-y-2">
              {rewards.map((reward, index) => (
                <button
                  key={index}
                  onClick={() => onRewardClick?.(reward)}
                  className="w-full flex items-center justify-between p-3 border rounded-xl hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{reward.icon}</span>
                    <span className="font-medium text-sm">{reward.name}</span>
                  </div>
                  <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
                    {reward.points} Pkt
                  </span>
                </button>
              ))}
            </div>
          )}
          
          {/* Info Tab */}
          {tab === 'info' && (
            <div className="space-y-2">
              {data.openingHours && (
                <div className="p-3 bg-muted/50 rounded-xl">
                  <p className="text-xs font-semibold mb-1">Öffnungszeiten</p>
                  <p className="text-xs text-muted-foreground">{data.openingHours}</p>
                </div>
              )}
              {data.address && (
                <div className="p-3 bg-muted/50 rounded-xl">
                  <p className="text-xs font-semibold mb-1">Adresse</p>
                  <p className="text-xs text-muted-foreground">{data.address}</p>
                </div>
              )}
              <div className="flex gap-2">
                {data.phone && (
                  <a 
                    href={`tel:${data.phone}`}
                    className="flex-1 p-2 bg-muted/50 rounded-xl flex items-center justify-center gap-1 hover:bg-muted transition-colors"
                  >
                    <Phone className="w-3 h-3" />
                    <span className="text-[10px]">Anrufen</span>
                  </a>
                )}
                {data.instagram && (
                  <a 
                    href={data.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 p-2 bg-muted/50 rounded-xl flex items-center justify-center gap-1 hover:bg-muted transition-colors"
                  >
                    <Instagram className="w-3 h-3" />
                    <span className="text-[10px]">Instagram</span>
                  </a>
                )}
                {data.website && (
                  <a 
                    href={data.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 p-2 bg-muted/50 rounded-xl flex items-center justify-center gap-1 hover:bg-muted transition-colors"
                  >
                    <Globe className="w-3 h-3" />
                    <span className="text-[10px]">Website</span>
                  </a>
                )}
              </div>
            </div>
          )}
          
          {/* Offers Tab */}
          {tab === 'offers' && (
            <div className="space-y-2">
              {offers.map((offer, index) => (
                <div key={index} className="p-3 border-l-4 border-primary bg-primary/5 rounded-r-xl">
                  <p className="font-semibold text-sm">{offer.title}</p>
                  <p className="text-xs text-muted-foreground">{offer.description}</p>
                  {offer.time && (
                    <p className="text-[10px] text-primary mt-1">{offer.time}</p>
                  )}
                </div>
              ))}
              {offers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Keine Angebote verfügbar
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StampCardPreview;

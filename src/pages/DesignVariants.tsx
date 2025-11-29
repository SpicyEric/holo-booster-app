import { useState } from 'react';
import { Star, Gift, Info, Tag, MapPin, Clock, Phone, Globe, Instagram } from 'lucide-react';

// Mock data
const mockData = {
  name: "Café Sonnenschein",
  points: 7,
  coverImage: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=200&fit=crop",
  address: "Musterstraße 123, 12345 Berlin",
  phone: "+49 123 456789",
  website: "www.cafe-sonnenschein.de",
  instagram: "@cafesonnenschein",
  openingHours: "Mo-Fr: 8-18 Uhr, Sa: 9-16 Uhr",
  rewards: [
    { name: "Gratis Kaffee", points: 10, icon: "☕" },
    { name: "20% Rabatt", points: 15, icon: "💰" },
    { name: "Gratis Kuchen", points: 20, icon: "🎂" },
  ],
  offers: [
    { title: "Happy Hour", desc: "2 für 1 auf alle Getränke", time: "14-16 Uhr" },
    { title: "Studentenrabatt", desc: "10% mit Ausweis", time: "Täglich" },
  ]
};

// Phone Frame Component
const PhoneFrame = ({ children, title }: { children: React.ReactNode; title: string }) => (
  <div className="flex flex-col items-center">
    <h3 className="text-lg font-semibold mb-3 text-foreground">{title}</h3>
    <div className="relative w-[280px] h-[560px] bg-black rounded-[40px] p-2 shadow-2xl">
      <div className="w-full h-full bg-background rounded-[32px] overflow-hidden">
        {children}
      </div>
    </div>
  </div>
);

// Full Cover with Bottom Sheet Style
const FullCoverDesign = () => {
  const [tab, setTab] = useState<'rewards' | 'info' | 'offers'>('rewards');
  
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Full Cover */}
      <div className="relative h-44">
        <img src={mockData.coverImage} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        
        {/* Points Badge */}
        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="text-white font-bold text-sm">{mockData.points} Punkte</span>
        </div>
      </div>
      
      {/* Bottom Sheet */}
      <div className="flex-1 -mt-6 bg-background rounded-t-3xl flex flex-col">
        <div className="p-4 pb-2">
          <h2 className="font-bold text-xl">{mockData.name}</h2>
        </div>
        
        {/* Icon Tabs */}
        <div className="flex border-b px-4">
          {[
            { key: 'rewards', icon: Gift, label: 'Prämien' },
            { key: 'info', icon: Info, label: 'Info' },
            { key: 'offers', icon: Tag, label: 'Angebote' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 transition-all ${
                tab === t.key ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <t.icon className="w-4 h-4" />
              <span className="text-[10px]">{t.label}</span>
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="flex-1 p-4 overflow-hidden">
          {tab === 'rewards' && (
            <div className="space-y-2">
              {mockData.rewards.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{r.icon}</span>
                    <span className="font-medium text-sm">{r.name}</span>
                  </div>
                  <button className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
                    {r.points} Pkt
                  </button>
                </div>
              ))}
            </div>
          )}
          {tab === 'info' && (
            <div className="space-y-2">
              <div className="p-3 bg-muted/50 rounded-xl">
                <p className="text-xs font-semibold mb-1">Öffnungszeiten</p>
                <p className="text-xs text-muted-foreground">{mockData.openingHours}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-xl">
                <p className="text-xs font-semibold mb-1">Adresse</p>
                <p className="text-xs text-muted-foreground">{mockData.address}</p>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 p-2 bg-muted/50 rounded-xl flex items-center justify-center gap-1">
                  <Phone className="w-3 h-3" />
                  <span className="text-[10px]">Anrufen</span>
                </button>
                <button className="flex-1 p-2 bg-muted/50 rounded-xl flex items-center justify-center gap-1">
                  <Instagram className="w-3 h-3" />
                  <span className="text-[10px]">Instagram</span>
                </button>
                <button className="flex-1 p-2 bg-muted/50 rounded-xl flex items-center justify-center gap-1">
                  <Globe className="w-3 h-3" />
                  <span className="text-[10px]">Website</span>
                </button>
              </div>
            </div>
          )}
          {tab === 'offers' && (
            <div className="space-y-2">
              {mockData.offers.map((o, i) => (
                <div key={i} className="p-3 border-l-4 border-primary bg-primary/5 rounded-r-xl">
                  <p className="font-semibold text-sm">{o.title}</p>
                  <p className="text-xs text-muted-foreground">{o.desc}</p>
                  <p className="text-[10px] text-primary mt-1">{o.time}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DesignVariants = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2 text-foreground">Stempelkarten Design</h1>
        <p className="text-center text-muted-foreground mb-8">Full-Cover + Button-Sheet Variante</p>
        
        <div className="flex justify-center">
          <PhoneFrame title="Full-Cover + Bottom Sheet">
            <FullCoverDesign />
          </PhoneFrame>
        </div>
      </div>
    </div>
  );
};

export default DesignVariants;

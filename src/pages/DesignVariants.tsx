import { useState } from 'react';
import { Star, Gift, Info, Tag, MapPin, Clock, Phone, Globe, Instagram, Facebook, ChevronRight, Heart, Sparkles, Award, Coffee, Percent } from 'lucide-react';

// Mock data for all variants
const mockData = {
  name: "Café Sonnenschein",
  points: 7,
  maxPoints: 10,
  coverImage: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=200&fit=crop",
  logo: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=100&h=100&fit=crop",
  address: "Musterstraße 123, 12345 Berlin",
  phone: "+49 123 456789",
  website: "www.cafe-sonnenschein.de",
  instagram: "@cafesonnenschein",
  openingHours: "Mo-Fr: 8-18 Uhr, Sa: 9-16 Uhr",
  rewards: [
    { name: "Gratis Kaffee", points: 10, icon: Coffee },
    { name: "20% Rabatt", points: 15, icon: Percent },
    { name: "Gratis Kuchen", points: 20, icon: Gift },
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

// Progress Ring Component
const ProgressRing = ({ current, max, size = 80 }: { current: number; max: number; size?: number }) => {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (current / max) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold">{current}</span>
        <span className="text-[10px] text-muted-foreground">von {max}</span>
      </div>
    </div>
  );
};

// Tab Component
const TabButton = ({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex-1 py-2 text-xs font-medium transition-all ${
      active 
        ? 'text-primary border-b-2 border-primary' 
        : 'text-muted-foreground hover:text-foreground'
    }`}
  >
    {children}
  </button>
);

// ============ VARIANT 1: Cover Image Hero with Floating Card ============
const Variant1 = () => {
  const [tab, setTab] = useState<'rewards' | 'info' | 'offers'>('rewards');
  
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Cover Image Hero */}
      <div className="relative h-36">
        <img src={mockData.coverImage} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
      
      {/* Floating Points Card */}
      <div className="relative -mt-12 mx-4">
        <div className="bg-card rounded-2xl p-4 shadow-lg border">
          <div className="flex items-center gap-4">
            <img src={mockData.logo} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-background" />
            <div className="flex-1">
              <h2 className="font-bold text-base">{mockData.name}</h2>
              <p className="text-xs text-muted-foreground">Noch {mockData.maxPoints - mockData.points} Punkte bis zur Prämie</p>
            </div>
            <ProgressRing current={mockData.points} max={mockData.maxPoints} size={56} />
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b mt-4 mx-4">
        <TabButton active={tab === 'rewards'} onClick={() => setTab('rewards')}>Prämien</TabButton>
        <TabButton active={tab === 'info'} onClick={() => setTab('info')}>Info</TabButton>
        <TabButton active={tab === 'offers'} onClick={() => setTab('offers')}>Angebote</TabButton>
      </div>
      
      {/* Content */}
      <div className="flex-1 p-4 overflow-hidden">
        {tab === 'rewards' && (
          <div className="space-y-2">
            {mockData.rewards.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <r.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="flex-1 font-medium text-sm">{r.name}</span>
                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">{r.points} Pkt</span>
              </div>
            ))}
          </div>
        )}
        {tab === 'info' && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
              <span>{mockData.address}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{mockData.openingHours}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{mockData.phone}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Instagram className="w-4 h-4 text-muted-foreground" />
              <span>{mockData.instagram}</span>
            </div>
          </div>
        )}
        {tab === 'offers' && (
          <div className="space-y-2">
            {mockData.offers.map((o, i) => (
              <div key={i} className="p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">{o.title}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{o.desc}</p>
                <p className="text-[10px] text-primary mt-1">{o.time}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============ VARIANT 2: Logo Only with Horizontal Progress ============
const Variant2 = () => {
  const [tab, setTab] = useState<'rewards' | 'info' | 'offers'>('rewards');
  const progress = (mockData.points / mockData.maxPoints) * 100;
  
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-primary/5 to-background">
      {/* Header with Logo */}
      <div className="p-4 flex items-center gap-4">
        <img src={mockData.logo} alt="" className="w-16 h-16 rounded-2xl object-cover shadow-lg" />
        <div className="flex-1">
          <h2 className="font-bold text-lg">{mockData.name}</h2>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm font-bold text-primary">{mockData.points}/{mockData.maxPoints}</span>
          </div>
        </div>
      </div>
      
      {/* Pill Tabs */}
      <div className="flex gap-2 px-4 pb-4">
        {(['rewards', 'info', 'offers'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-full text-xs font-medium transition-all ${
              tab === t 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {t === 'rewards' ? 'Prämien' : t === 'info' ? 'Info' : 'Angebote'}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="flex-1 bg-background rounded-t-3xl p-4 overflow-hidden">
        {tab === 'rewards' && (
          <div className="grid grid-cols-3 gap-2">
            {mockData.rewards.map((r, i) => (
              <div key={i} className="flex flex-col items-center p-3 bg-muted/50 rounded-xl text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                  <r.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-[10px] font-medium leading-tight">{r.name}</span>
                <span className="text-[10px] text-primary font-bold mt-1">{r.points} Pkt</span>
              </div>
            ))}
          </div>
        )}
        {tab === 'info' && (
          <div className="space-y-3">
            {[
              { icon: MapPin, text: mockData.address },
              { icon: Clock, text: mockData.openingHours },
              { icon: Phone, text: mockData.phone },
              { icon: Globe, text: mockData.website },
              { icon: Instagram, text: mockData.instagram },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                <item.icon className="w-4 h-4 text-primary" />
                <span className="text-xs">{item.text}</span>
              </div>
            ))}
          </div>
        )}
        {tab === 'offers' && (
          <div className="space-y-2">
            {mockData.offers.map((o, i) => (
              <div key={i} className="p-3 bg-muted/50 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{o.title}</p>
                  <p className="text-xs text-muted-foreground">{o.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============ VARIANT 3: Full Cover with Bottom Sheet Style ============
const Variant3 = () => {
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
          <p className="text-xs text-muted-foreground mt-1">Noch {mockData.maxPoints - mockData.points} Punkte bis zur nächsten Prämie!</p>
          
          {/* Visual Progress */}
          <div className="flex gap-1 mt-3">
            {Array.from({ length: mockData.maxPoints }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-2 rounded-full ${i < mockData.points ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
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
                    <r.icon className="w-5 h-5 text-primary" />
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

// ============ VARIANT 4: Compact Header with Card Grid ============
const Variant4 = () => {
  const [tab, setTab] = useState<'rewards' | 'info' | 'offers'>('rewards');
  
  return (
    <div className="h-full flex flex-col bg-muted/30">
      {/* Compact Header */}
      <div className="bg-primary p-4 pb-8">
        <div className="flex items-center gap-3">
          <img src={mockData.logo} alt="" className="w-12 h-12 rounded-xl object-cover" />
          <div className="flex-1 text-primary-foreground">
            <h2 className="font-bold">{mockData.name}</h2>
            <p className="text-xs opacity-80">Treueprogramm</p>
          </div>
        </div>
      </div>
      
      {/* Points Card */}
      <div className="mx-4 -mt-4 bg-card rounded-2xl p-4 shadow-lg flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Deine Punkte</p>
          <p className="text-3xl font-bold text-primary">{mockData.points}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Nächste Prämie</p>
          <p className="text-lg font-semibold">{mockData.maxPoints} Pkt</p>
        </div>
        <ProgressRing current={mockData.points} max={mockData.maxPoints} size={50} />
      </div>
      
      {/* Segmented Control */}
      <div className="mx-4 mt-4 bg-muted rounded-xl p-1 flex">
        {(['rewards', 'info', 'offers'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === t ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
            }`}
          >
            {t === 'rewards' ? 'Prämien' : t === 'info' ? 'Info' : 'Angebote'}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="flex-1 p-4 overflow-hidden">
        {tab === 'rewards' && (
          <div className="space-y-2">
            {mockData.rewards.map((r, i) => (
              <div key={i} className="bg-card p-3 rounded-xl flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center">
                  <r.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.points} Punkte benötigt</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
        {tab === 'info' && (
          <div className="bg-card rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-primary mt-0.5" />
              <div>
                <p className="text-xs font-semibold">Öffnungszeiten</p>
                <p className="text-xs text-muted-foreground">{mockData.openingHours}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-primary mt-0.5" />
              <div>
                <p className="text-xs font-semibold">Adresse</p>
                <p className="text-xs text-muted-foreground">{mockData.address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-primary mt-0.5" />
              <div>
                <p className="text-xs font-semibold">Telefon</p>
                <p className="text-xs text-muted-foreground">{mockData.phone}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button className="flex-1 bg-primary/10 text-primary text-xs py-2 rounded-lg">Instagram</button>
              <button className="flex-1 bg-primary/10 text-primary text-xs py-2 rounded-lg">Website</button>
            </div>
          </div>
        )}
        {tab === 'offers' && (
          <div className="space-y-2">
            {mockData.offers.map((o, i) => (
              <div key={i} className="bg-card p-3 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  <span className="font-semibold text-sm">{o.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{o.desc}</p>
                <span className="inline-block mt-2 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">{o.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============ VARIANT 5: Minimalist with Large Points Display ============
const Variant5 = () => {
  const [tab, setTab] = useState<'rewards' | 'info' | 'offers'>('rewards');
  
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Minimal Header */}
      <div className="p-4 text-center">
        <img src={mockData.logo} alt="" className="w-20 h-20 rounded-full object-cover mx-auto shadow-lg border-4 border-background" />
        <h2 className="font-bold text-lg mt-3">{mockData.name}</h2>
      </div>
      
      {/* Large Points Display */}
      <div className="px-4 py-6 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
        <div className="text-center">
          <p className="text-5xl font-bold text-primary">{mockData.points}</p>
          <p className="text-sm text-muted-foreground mt-1">von {mockData.maxPoints} Punkten</p>
          <div className="flex justify-center gap-1 mt-3">
            {Array.from({ length: mockData.maxPoints }).map((_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${i < mockData.points ? 'text-yellow-400 fill-yellow-400' : 'text-muted'}`}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b">
        <TabButton active={tab === 'rewards'} onClick={() => setTab('rewards')}>Prämien</TabButton>
        <TabButton active={tab === 'info'} onClick={() => setTab('info')}>Info</TabButton>
        <TabButton active={tab === 'offers'} onClick={() => setTab('offers')}>Angebote</TabButton>
      </div>
      
      {/* Content */}
      <div className="flex-1 p-4 overflow-hidden">
        {tab === 'rewards' && (
          <div className="space-y-2">
            {mockData.rewards.map((r, i) => (
              <button key={i} className="w-full p-3 bg-muted/50 rounded-xl flex items-center gap-3 hover:bg-muted transition-colors">
                <r.icon className="w-5 h-5 text-primary" />
                <span className="flex-1 text-left font-medium text-sm">{r.name}</span>
                <span className="text-xs text-muted-foreground">{r.points} Pkt</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
        {tab === 'info' && (
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> {mockData.openingHours}</p>
            <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {mockData.address}</p>
            <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> {mockData.phone}</p>
            <p className="flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> {mockData.website}</p>
            <p className="flex items-center gap-2"><Instagram className="w-4 h-4 text-primary" /> {mockData.instagram}</p>
          </div>
        )}
        {tab === 'offers' && (
          <div className="space-y-2">
            {mockData.offers.map((o, i) => (
              <div key={i} className="p-3 bg-muted/50 rounded-xl">
                <p className="font-semibold text-sm">{o.title}</p>
                <p className="text-xs text-muted-foreground">{o.desc} • {o.time}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============ VARIANT 6: Split Design with Gradient ============
const Variant6 = () => {
  const [tab, setTab] = useState<'rewards' | 'info' | 'offers'>('rewards');
  
  return (
    <div className="h-full flex flex-col">
      {/* Gradient Header with Cover */}
      <div className="relative h-32 bg-gradient-to-br from-primary via-primary/80 to-primary/60">
        <div className="absolute -bottom-8 left-4 right-4 flex items-end gap-3">
          <img src={mockData.logo} alt="" className="w-16 h-16 rounded-2xl object-cover border-4 border-background shadow-lg" />
          <div className="flex-1 pb-2">
            <h2 className="font-bold text-white text-shadow">{mockData.name}</h2>
          </div>
        </div>
      </div>
      
      {/* Points Section */}
      <div className="mt-10 mx-4 flex items-center justify-between bg-card rounded-xl p-3 shadow border">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          <span className="font-medium text-sm">Punkte</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">{mockData.points}</span>
          <span className="text-sm text-muted-foreground">/ {mockData.maxPoints}</span>
        </div>
      </div>
      
      {/* Chip Tabs */}
      <div className="flex gap-2 p-4 overflow-x-auto">
        {[
          { key: 'rewards', icon: Gift, label: 'Prämien' },
          { key: 'info', icon: Info, label: 'Info' },
          { key: 'offers', icon: Tag, label: 'Angebote' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              tab === t.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <t.icon className="w-3 h-3" />
            {t.label}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="flex-1 px-4 pb-4 overflow-hidden">
        {tab === 'rewards' && (
          <div className="h-full bg-muted/30 rounded-2xl p-3 space-y-2">
            {mockData.rewards.map((r, i) => (
              <div key={i} className="bg-card p-3 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <r.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="flex-1 text-sm font-medium">{r.name}</span>
                <span className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full">{r.points}</span>
              </div>
            ))}
          </div>
        )}
        {tab === 'info' && (
          <div className="h-full bg-muted/30 rounded-2xl p-3 space-y-2">
            <div className="bg-card p-3 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
                <Clock className="w-3 h-3" /> ÖFFNUNGSZEITEN
              </div>
              <p className="text-sm">{mockData.openingHours}</p>
            </div>
            <div className="bg-card p-3 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
                <MapPin className="w-3 h-3" /> ADRESSE
              </div>
              <p className="text-sm">{mockData.address}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button className="bg-card p-2 rounded-xl flex flex-col items-center gap-1">
                <Phone className="w-4 h-4 text-primary" />
                <span className="text-[10px]">Anrufen</span>
              </button>
              <button className="bg-card p-2 rounded-xl flex flex-col items-center gap-1">
                <Instagram className="w-4 h-4 text-primary" />
                <span className="text-[10px]">Instagram</span>
              </button>
              <button className="bg-card p-2 rounded-xl flex flex-col items-center gap-1">
                <Globe className="w-4 h-4 text-primary" />
                <span className="text-[10px]">Website</span>
              </button>
            </div>
          </div>
        )}
        {tab === 'offers' && (
          <div className="h-full bg-muted/30 rounded-2xl p-3 space-y-2">
            {mockData.offers.map((o, i) => (
              <div key={i} className="bg-card p-3 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{o.title}</span>
                  <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">{o.time}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{o.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============ MAIN PAGE ============
export default function DesignVariants() {
  return (
    <div className="min-h-screen bg-muted/50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Stempelkarten UI Varianten</h1>
        <p className="text-muted-foreground mb-8">6 verschiedene Design-Ansätze für die Händler-Stempelkarten-Ansicht</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <PhoneFrame title="1. Cover Hero + Floating Card">
            <Variant1 />
          </PhoneFrame>
          
          <PhoneFrame title="2. Logo Only + Horizontal Progress">
            <Variant2 />
          </PhoneFrame>
          
          <PhoneFrame title="3. Full Cover + Bottom Sheet">
            <Variant3 />
          </PhoneFrame>
          
          <PhoneFrame title="4. Compact Header + Card Grid">
            <Variant4 />
          </PhoneFrame>
          
          <PhoneFrame title="5. Minimalist + Large Points">
            <Variant5 />
          </PhoneFrame>
          
          <PhoneFrame title="6. Split Design + Gradient">
            <Variant6 />
          </PhoneFrame>
        </div>
      </div>
    </div>
  );
}

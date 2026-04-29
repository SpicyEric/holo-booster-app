import StampCardPreview, { StampCardData } from '@/components/StampCardPreview';
import PhoneFrame from '@/components/PhoneFrame';

// Demo data for preview
const demoData: StampCardData = {
  name: "Café Sonnenschein",
  points: 7,
  coverImage: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=200&fit=crop",
  address: "Musterstraße 123, 12345 Berlin",
  phone: "+49 123 456789",
  website: "https://www.cafe-sonnenschein.de",
  instagram: "https://instagram.com/cafesonnenschein",
  openingHours: "Mo-Fr: 8-18 Uhr, Sa: 9-16 Uhr",
  rewards: [
    { name: "Gratis Kaffee", points: 10, icon: "☕" },
    { name: "20% Rabatt", points: 15, icon: "💰" },
    { name: "Gratis Kuchen", points: 20, icon: "🎂" },
  ],
  offers: [
    { title: "Happy Hour", description: "2 für 1 auf alle Getränke", time: "14-16 Uhr" },
    { title: "Studentenrabatt", description: "10% mit Ausweis", time: "Täglich" },
  ]
};

const DesignVariants = () => {
  const handleRewardClick = (reward: { name: string; points: number }) => {
    console.log('Reward clicked:', reward);
    // In real app: open redemption dialog
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2 text-foreground">Punktekarten Design</h1>
        <p className="text-center text-muted-foreground mb-8">Finales Template - Full-Cover + Bottom Sheet</p>
        
        <div className="flex justify-center">
          <PhoneFrame title="Vorschau">
            <StampCardPreview 
              data={demoData} 
              onRewardClick={handleRewardClick}
            />
          </PhoneFrame>
        </div>
      </div>
    </div>
  );
};

export default DesignVariants;

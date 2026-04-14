import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Gift, Sparkles, Zap, Star, MessageCircle, CalendarHeart } from 'lucide-react';
import './MarketingCarousel.css';

const marketingFeatures = [
  {
    icon: Gift,
    title: 'Eigene Prämien',
    desc: 'Bestimme selbst, welche Belohnungen deine Kunden erhalten – ganz nach deinen Vorstellungen.',
  },
  {
    icon: Sparkles,
    title: 'Neukundenaktionen',
    desc: 'Gezielt neue Kunden ansprechen, die noch nie in deinem Geschäft waren – mit attraktiven Willkommens-Angeboten.',
  },
  {
    icon: Zap,
    title: 'Neukunden-Boost',
    desc: 'Maximale Sichtbarkeit für deine Neukundenprämie – ganz oben in der App sponsern lassen.',
  },
  {
    icon: Star,
    title: 'Bewertungs-Bonus',
    desc: 'Kunden werden automatisch an Google-Bewertungen erinnert und dafür mit Punkten belohnt – vollautomatisch.',
  },
  {
    icon: MessageCircle,
    title: 'Smarte Nachrichten',
    desc: 'Personalisierte Push-Nachrichten an bestimmte Gruppen oder alle Kunden – mit exklusiven Angeboten oder Bonuspunkten.',
  },
  {
    icon: CalendarHeart,
    title: 'Geburtstags-Automation',
    desc: 'Automatische Geburtstagsgrüße mit Punkten oder personalisierten Angeboten – deine Kunden fühlen sich besonders.',
  },
];

const MAX_VISIBILITY = 3;

const MarketingCarousel = () => {
  const [active, setActive] = useState(0);
  const count = marketingFeatures.length;

  return (
    <div className="marketing-carousel-wrapper">
      <div className="marketing-carousel">
        {active > 0 && (
          <button className="carousel-nav left" onClick={() => setActive((i) => i - 1)}>
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}
        {marketingFeatures.map((feature, i) => {
          const offset = (active - i) / 3;
          const absOffset = Math.abs(offset);
          const direction = Math.sign(active - i);
          const isActive = i === active;

          return (
            <div
              key={feature.title}
              className="carousel-card-container"
              style={{
                '--offset': offset,
                '--abs-offset': absOffset,
                '--direction': direction,
                '--active': isActive ? 1 : 0,
                opacity: absOffset >= MAX_VISIBILITY ? 0 : 1,
                display: absOffset > MAX_VISIBILITY ? 'none' : 'block',
                pointerEvents: isActive ? 'auto' : 'none',
              } as React.CSSProperties}
            >
              <div className="carousel-card">
                <div className="carousel-card-icon">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="carousel-card-title">{feature.title}</h3>
                <p className="carousel-card-desc">{feature.desc}</p>
              </div>
            </div>
          );
        })}
        {active < count - 1 && (
          <button className="carousel-nav right" onClick={() => setActive((i) => i + 1)}>
            <ChevronRight className="h-8 w-8" />
          </button>
        )}
      </div>
    </div>
  );
};

export default MarketingCarousel;

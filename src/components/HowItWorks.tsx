import { useEffect, useRef, useState } from 'react';

const steps = [
  {
    num: '1',
    title: 'Kunde scannt den Stempel',
    text: 'Dein Mitarbeiter hält den Eloyo-Stempel ans Handy — ein kurzer Tap und Punkte sind sofort gutgeschrieben.',
  },
  {
    num: '2',
    title: 'Sammelt Punkte, löst Prämien ein',
    text: 'Jeder Besuch wird belohnt. Der Kunde wählt selbst — das schafft echte Motivation und er kommt wieder.',
  },
  {
    num: '3',
    title: 'Bringt neue Kunden rein',
    text: 'Der Kunde teilt seinen Einladungslink. Du bekommst Neukunden — ohne einen Euro Werbekosten.',
  },
];

export default function HowItWorks() {
  const [step, setStep] = useState(0);
  const [spread, setSpread] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      if (!wrapRef.current) return;
      const rect = wrapRef.current.getBoundingClientRect();
      const scrolled = -rect.top;
      const total = wrapRef.current.offsetHeight - window.innerHeight;
      const pct = Math.max(0, Math.min(0.999, scrolled / total));
      const s = Math.min(2, Math.floor(pct * 3));

      if (scrolled < 0) {
        setSpread(false);
        setStep(0);
        return;
      }
      if (pct >= 0.92) {
        setSpread(true);
      } else {
        setSpread(false);
        setStep(s);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section>
      <div className="text-center pt-16 pb-6">
        <h2 className="text-3xl md:text-4xl font-bold">So einfach wie Händeschütteln</h2>
        <p className="text-gray-500 mt-2">Drei Schritte zu mehr Umsatz und glücklicheren Kunden.</p>
      </div>

      <div ref={wrapRef} style={{ height: '160vh', position: 'relative' }}>
        <div style={{
          position: 'sticky', top: 0, height: '100vh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>

          <p style={{
            fontSize: '22px', fontWeight: 500, marginBottom: '2rem',
            opacity: step >= 0 ? 1 : 0, transition: 'opacity 0.4s',
          }}>
            So einfach wie Händeschütteln
          </p>

          <div style={{ position: 'relative', width: '580px', height: '280px' }}>
            {steps.map((s, i) => {
              let style: React.CSSProperties = {
                position: 'absolute',
                background: 'white',
                border: '0.5px solid rgba(0,0,0,0.1)',
                borderRadius: '16px',
                overflow: 'hidden',
                transition: 'all 0.6s cubic-bezier(0.4,0,0.2,1)',
                padding: '1.4rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
              };

              if (spread) {
                style = {
                  ...style,
                  left: `${i * 196}px`,
                  width: '176px',
                  height: '280px',
                  opacity: 1,
                  pointerEvents: 'auto',
                };
              } else {
                style = {
                  ...style,
                  left: '50%',
                  width: '520px',
                  height: '280px',
                  transform: 'translateX(-50%)',
                  opacity: i === step ? 1 : 0,
                  pointerEvents: i === step ? 'auto' : 'none',
                };
              }

              return (
                <div key={i} style={style}>
                  <div style={{
                    position: 'absolute', top: '-10px', right: '10px',
                    fontSize: spread ? '80px' : '120px',
                    fontWeight: 600, lineHeight: 1,
                    color: 'rgba(124,58,237,0.08)',
                    userSelect: 'none',
                    transition: 'font-size 0.5s ease',
                  }}>
                    {s.num}
                  </div>
                  <div style={{ width: '24px', height: '3px', background: '#7C3AED', borderRadius: '2px', marginBottom: '10px' }} />
                  <p style={{ fontSize: spread ? '13px' : '18px', fontWeight: 600, margin: '0 0 6px', transition: 'font-size 0.4s' }}>{s.title}</p>
                  <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.55, margin: 0 }}>{s.text}</p>
                </div>
              );
            })}
          </div>

          {!spread && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '1.5rem' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: step === i ? '#7C3AED' : '#D1D5DB',
                  transform: step === i ? 'scale(1.4)' : 'scale(1)',
                  transition: 'all 0.3s ease',
                }} />
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ height: '60px' }} />
    </section>
  );
}

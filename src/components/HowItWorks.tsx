import { useEffect, useRef, useState } from 'react';

const steps = [
  {
    num: '1',
    title: 'Kunde scannt den Stempel',
    text: 'Dein Mitarbeiter hält den Eloyo-Stempel ans Handy des Kunden — ein kurzer Tap und die Punkte sind sofort gutgeschrieben.',
  },
  {
    num: '2',
    title: 'Sammelt Punkte, löst Prämien ein',
    text: 'Jeder Besuch wird belohnt. Der Kunde wählt selbst was er will — das schafft echte Motivation und er kommt wieder.',
  },
  {
    num: '3',
    title: 'Bringt neue Kunden rein',
    text: 'Der Kunde teilt seinen persönlichen Einladungslink. Du bekommst Neukunden — ohne einen Euro Werbekosten.',
  },
];

export default function HowItWorks() {
  const [step, setStep] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      if (!wrapRef.current) return;
      const rect = wrapRef.current.getBoundingClientRect();
      const scrolled = -rect.top;
      const total = wrapRef.current.offsetHeight - window.innerHeight;
      const pct = Math.max(0, Math.min(0.999, scrolled / total));
      const s = Math.min(2, Math.floor(pct * 3));
      setStep(s);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section>
      <div style={{ textAlign: 'center', paddingTop: '4rem', paddingBottom: '2rem' }}>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">So einfach wie Händeschütteln</h2>
        <p className="text-gray-500 mt-2">Drei Schritte zu mehr Umsatz und glücklicheren Kunden.</p>
      </div>

      <div ref={wrapRef} style={{ height: '280vh', position: 'relative' }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '700px', height: '420px' }}>

            {steps.map((s, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute', inset: 0,
                  opacity: step === i ? 1 : 0,
                  transform: step === i ? 'scale(1)' : 'scale(0.88)',
                  transition: 'opacity 0.5s ease, transform 0.5s ease',
                  pointerEvents: step === i ? 'auto' : 'none',
                }}
              >
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'clamp(180px, 30vw, 280px)',
                  fontWeight: 600,
                  color: 'rgba(124, 58, 237, 0.08)',
                  lineHeight: 1,
                  userSelect: 'none',
                  letterSpacing: '-8px',
                }}>
                  {s.num}
                </div>

                <div style={{ position: 'absolute', bottom: '40px', left: '40px', right: '40px' }}>
                  <div style={{ width: '28px', height: '3px', background: '#7C3AED', borderRadius: '2px', marginBottom: '12px' }} />
                  <p style={{ fontSize: '22px', fontWeight: 600, color: 'inherit', margin: '0 0 8px' }}>{s.title}</p>
                  <p style={{ fontSize: '16px', color: 'gray', lineHeight: 1.6, margin: 0, maxWidth: '480px' }}>{s.text}</p>
                </div>
              </div>
            ))}

          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', paddingBottom: '4rem' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: step === i ? '#7C3AED' : '#D1D5DB',
            transform: step === i ? 'scale(1.4)' : 'scale(1)',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>
    </section>
  );
}

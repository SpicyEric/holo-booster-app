export const DotGrid = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--primary) / 0.3) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at 30% 20%, hsl(var(--primary) / 0.15), transparent 50%),
                       radial-gradient(circle at 70% 80%, hsl(var(--secondary) / 0.15), transparent 50%)`,
        }}
      />
    </div>
  );
};

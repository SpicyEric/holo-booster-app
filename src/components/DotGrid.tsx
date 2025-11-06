export const DotGrid = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(0, 0, 0, 0.15) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />
    </div>
  );
};

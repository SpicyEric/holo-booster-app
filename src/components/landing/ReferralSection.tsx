import referralAnimation from "@/assets/referral-animation.mp4";

const ReferralSection = () => {
  return (
    <section className="relative z-10 py-20 px-6 bg-white border-t border-b border-[#ece6ff]">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
        {/* Text links */}
        <div className="text-left order-2 md:order-1">
          <span className="text-primary font-bold tracking-widest uppercase text-xs font-headline">
            Empfehlungen
          </span>
          <h3 className="font-headline text-3xl md:text-4xl font-extrabold mt-3 mb-5 leading-tight tracking-[-0.02em] text-[#1a1b21]">
            Was wäre, wenn deine zufriedenen Kunden für dich neue Kunden ins Geschäft holen?
          </h3>
          <p className="text-[#4a4455] text-lg leading-relaxed">
            Ohne dass du einen Euro für Werbung ausgibst. Das ist kein Traum –
            das ist Eloyo Empfehlungsmarketing.
          </p>
          <p className="text-[#4a4455] text-lg leading-relaxed mt-4">
            Dadurch werden deine Kunden animiert, für Prämien Freunde mit in dein Geschäft zu bringen. Dadurch steigt effektiv dein Umsatz und du gewinnst langfristig neue Stammkunden dazu.
          </p>
        </div>

        {/* Video rechts — Kanten weich in den weißen Hintergrund verblendet */}
        <div className="flex justify-center md:justify-end order-1 md:order-2">
          <div className="relative w-full max-w-[520px]">
            <video
              src={referralAnimation}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="w-full h-auto block"
              style={{ background: "transparent" }}
            />
            {/* Fade-Overlays über die Video-Kanten */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReferralSection;

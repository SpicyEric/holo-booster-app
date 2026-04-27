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
        </div>

        {/* Video rechts — ohne Rahmen, transparent wirkend */}
        <div className="flex justify-center md:justify-end order-1 md:order-2">
          <video
            src={referralAnimation}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full max-w-[380px] h-auto block"
            style={{ background: "transparent" }}
          />
        </div>
      </div>
    </section>
  );
};

export default ReferralSection;

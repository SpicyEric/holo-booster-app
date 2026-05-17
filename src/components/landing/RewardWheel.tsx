import rewardWheelVideo from "@/assets/reward-wheel.mp4";

const RewardWheel = () => {
  return (
    <section className="relative z-10 py-20 px-6 bg-[#faf8ff]">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
        {/* Video */}
        <div className="flex justify-center md:justify-start">
          <div className="relative w-full max-w-[520px]">
            <video
              src={rewardWheelVideo}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="w-full h-auto block"
              style={{ background: "transparent" }}
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#faf8ff] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#faf8ff] to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#faf8ff] to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#faf8ff] to-transparent" />
          </div>
        </div>

        {/* Text */}
        <div className="text-left">
          <span className="text-primary font-bold tracking-widest uppercase text-xs font-headline">
            Treuepass
          </span>
          <h3 className="font-headline text-3xl md:text-4xl font-extrabold mt-3 mb-5 leading-tight tracking-[-0.02em] text-[#1a1b21]">
            Einfacher als eine Stempelkarte. Kraftvoller als ein Punktesystem.
          </h3>
          <p className="text-[#4a4455] text-lg leading-relaxed">
            Kein Katalog, keine Punkte, kein Aufwand. Deine Kunden checken ein, sammeln Fortschritt und werden automatisch belohnt – je öfter sie kommen, desto mehr haben sie davon.
          </p>
        </div>
      </div>
    </section>
  );
};

export default RewardWheel;

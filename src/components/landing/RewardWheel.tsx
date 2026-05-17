import { Gift } from "lucide-react";

const REWARDS = [
  { title: "Gratis Espresso", merchant: "Café Solera", points: 30, color: "from-amber-200 to-orange-300" },
  { title: "Haarschnitt gratis", merchant: "Studio Mara", points: 120, color: "from-rose-200 to-pink-300" },
  { title: "10% Rabatt", merchant: "Boutique Lina", points: 50, color: "from-violet-200 to-purple-300" },
  { title: "Kugel Eis extra", merchant: "Eis Dolce", points: 20, color: "from-sky-200 to-blue-300" },
  { title: "Gratis Frühstück", merchant: "Bäckerei Korn", points: 90, color: "from-yellow-200 to-amber-300" },
  { title: "Cocktail des Hauses", merchant: "Bar Noir", points: 80, color: "from-fuchsia-200 to-purple-300" },
  { title: "Bartpflege gratis", merchant: "Barber 13", points: 60, color: "from-emerald-200 to-teal-300" },
  { title: "Maniküre Upgrade", merchant: "Nail Lab", points: 70, color: "from-pink-200 to-rose-300" },
  { title: "Pizza Margherita", merchant: "Trattoria Vico", points: 100, color: "from-red-200 to-orange-300" },
  { title: "Smoothie XL", merchant: "Green Bowl", points: 40, color: "from-lime-200 to-green-300" },
  { title: "Massage 15 Min.", merchant: "Spa Aura", points: 150, color: "from-indigo-200 to-violet-300" },
  { title: "Gratis Croissant", merchant: "Café Petit", points: 25, color: "from-orange-200 to-yellow-300" },
  { title: "Burger Upgrade", merchant: "Smash House", points: 65, color: "from-red-200 to-rose-300" },
  { title: "Glas Wein gratis", merchant: "Vino Bar", points: 85, color: "from-purple-200 to-fuchsia-300" },
  { title: "Donut deiner Wahl", merchant: "Sweet Spot", points: 35, color: "from-pink-200 to-fuchsia-300" },
  { title: "Bowling-Bahn 30 Min", merchant: "Strike Club", points: 110, color: "from-cyan-200 to-sky-300" },
  { title: "Pilates Probestunde", merchant: "Move Studio", points: 95, color: "from-teal-200 to-emerald-300" },
  { title: "Tee-Spezialität", merchant: "Tea Room", points: 30, color: "from-green-200 to-lime-300" },
  { title: "Bowl in M", merchant: "Poke Spot", points: 75, color: "from-orange-200 to-red-300" },
  { title: "Body Lotion Probe", merchant: "Beauty Den", points: 45, color: "from-rose-200 to-pink-300" },
];

const RewardCard = ({ reward }: { reward: (typeof REWARDS)[number] }) => (
  <div className="w-full rounded-2xl bg-white border border-[#ece6ff] shadow-[0_4px_14px_rgba(82,39,255,0.08)] p-3 flex items-center gap-3">
    <div
      className={`w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br ${reward.color} flex items-center justify-center`}
    >
      <Gift className="h-5 w-5 text-white drop-shadow" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-[#1a1b21] text-sm truncate">{reward.title}</p>
      <p className="text-xs text-[#7a7488] truncate">{reward.merchant}</p>
    </div>
  </div>
);

const RewardWheel = () => {
  // Duplicate list for seamless loop
  const loop = [...REWARDS, ...REWARDS];

  return (
    <section className="relative z-10 py-20 px-6 bg-[#faf8ff]">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
        {/* Vertical reward wheel */}
        <div className="relative h-[480px] md:h-[520px] overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#f4f0ff] to-[#ede8ff] border border-[#e5dfff] p-4">
          {/* fade masks */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#f4f0ff] to-transparent z-10" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#ede8ff] to-transparent z-10" />

          <div className="reward-wheel-track flex flex-col gap-3">
            {loop.map((reward, i) => (
              <RewardCard key={`${reward.title}-${i}`} reward={reward} />
            ))}
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

      <style>{`
        @keyframes reward-wheel-scroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        .reward-wheel-track {
          animation: reward-wheel-scroll 40s linear infinite;
          will-change: transform;
        }
      `}</style>
    </section>
  );
};

export default RewardWheel;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Tooltip, TooltipContent, TooltipTrigger
} from "@/components/ui/tooltip";

import badgeErsterStempel from "@/assets/badges/badge-01-erster-stempel.svg";
import badgeStammkundenRing from "@/assets/badges/badge-02-stammkunden-ring.svg";
import badgeErsterBonus from "@/assets/badges/badge-03-erster-bonus.svg";
import badgeTreueSchild from "@/assets/badges/badge-04-treue-schild.svg";
import badgeNetzwerkStar from "@/assets/badges/badge-05-netzwerk-star.svg";
import badgeJubilaeum from "@/assets/badges/badge-06-jubilaeum.svg";
import badgeVipStammkunde from "@/assets/badges/badge-07-vip-stammkunde.svg";
import badgeGeburtstagskind from "@/assets/badges/badge-08-geburtstagskind.svg";
import badgeStimmeErhoben from "@/assets/badges/badge-09-stimme-erhoben.svg";
import badgePunktSammler from "@/assets/badges/badge-11-punkt-sammler.svg";
import badgeRakete from "@/assets/badges/badge-12-rakete.svg";

interface BadgeDef {
  key: string;
  label: string;
  icon: string;
  getTooltip: (meta?: Record<string, any>) => string;
}

const BADGE_DEFS: BadgeDef[] = [
  { key: "erster_stempel", label: "Erster Stempel", icon: badgeErsterStempel, getTooltip: () => "Dein erster Stempel wurde vergeben!" },
  { key: "stammkunden_ring", label: "Stammkundenring", icon: badgeStammkundenRing, getTooltip: () => "8 Stammkunden gewonnen (6+ Stempel)" },
  { key: "erster_bonus", label: "Erster Bonus", icon: badgeErsterBonus, getTooltip: () => "Die erste Prämie wurde eingelöst!" },
  { key: "treue_schild", label: "Treueschild", icon: badgeTreueSchild, getTooltip: () => "6 Monate dabei – danke für deine Treue!" },
  { key: "netzwerk_star", label: "Netzwerkstar", icon: badgeNetzwerkStar, getTooltip: (m) => `${m?.count || 3}+ Geschäfte in deiner PLZ nutzen Eloyo` },
  { key: "jubilaeum", label: "Jubiläum", icon: badgeJubilaeum, getTooltip: () => "1 Jahr dabei – vielen Dank, dass du mit uns arbeitest!" },
  { key: "vip_stammkunde", label: "VIP-Stammkunde", icon: badgeVipStammkunde, getTooltip: () => "5 VIP-Stammkunden (15+ Stempel)" },
  { key: "geburtstagskind", label: "Geburtstagskind", icon: badgeGeburtstagskind, getTooltip: () => "Erster Geburtstagsgruß versendet!" },
  { key: "stimme_erhoben", label: "Stimme erhoben", icon: badgeStimmeErhoben, getTooltip: () => "Erste Google-Bewertung über Eloyo erhalten!" },
  { key: "punkt_sammler", label: "Punktesammler", icon: badgePunktSammler, getTooltip: () => "500 Punkte insgesamt vergeben!" },
  { key: "rakete", label: "Rakete", icon: badgeRakete, getTooltip: () => "Über 300 Endkunden gesammelt!" },
];

interface Props {
  customerId: string;
  customerCreatedAt?: string;
  postalCode?: string | null;
  birthdayEnabled?: boolean;
}

export default function MerchantBadges({ customerId, customerCreatedAt, postalCode, birthdayEnabled }: Props) {
  const [earnedBadges, setEarnedBadges] = useState<Record<string, { earned_at: string; metadata: Record<string, any> }>>({});

  useEffect(() => {
    if (customerId) {
      loadBadges();
      checkAndAwardBadges();
    }
  }, [customerId]);

  const loadBadges = async () => {
    const { data } = await supabase
      .from("merchant_badges" as any)
      .select("badge_key, earned_at, metadata")
      .eq("customer_id", customerId);
    if (data) {
      const map: Record<string, any> = {};
      (data as any[]).forEach((b: any) => { map[b.badge_key] = { earned_at: b.earned_at, metadata: b.metadata || {} }; });
      setEarnedBadges(map);
    }
  };

  const awardBadge = async (key: string, metadata: Record<string, any> = {}) => {
    await supabase.from("merchant_badges" as any).upsert(
      { customer_id: customerId, badge_key: key, metadata } as any,
      { onConflict: "customer_id,badge_key" }
    );
  };

  const checkAndAwardBadges = async () => {
    try {
      const checks = await Promise.all([
        // 1. Erster Stempel: totalStamps >= 1
        supabase.from("point_transactions").select("*", { count: "exact", head: true }).eq("merchant_customer_id", customerId).eq("transaction_type", "nfc_stamp"),
        // 2. Erster Bonus: totalRedemptions >= 1
        supabase.from("reward_redemptions").select("*", { count: "exact", head: true }).eq("merchant_customer_id", customerId),
        // 3. Loyalty accounts for segment analysis
        supabase.from("loyalty_accounts").select("id, user_id").eq("merchant_customer_id", customerId),
        // 4. Google review claims
        supabase.from("google_review_claims").select("*", { count: "exact", head: true }).eq("merchant_customer_id", customerId),
        // 5. Network: same postal code merchants
        postalCode ? supabase.from("customers").select("id", { count: "exact", head: true }).eq("postal_code", postalCode).eq("status", "active") : Promise.resolve({ count: 0 }),
      ]);

      const totalStamps = checks[0].count || 0;
      const totalRedemptions = checks[1].count || 0;
      const loyaltyAccounts = checks[2].data || [];
      const googleReviews = checks[3].count || 0;
      const networkCount = (checks[4] as any).count || 0;

      const newBadges: { key: string; metadata?: Record<string, any> }[] = [];

      // Erster Stempel
      if (totalStamps >= 1) newBadges.push({ key: "erster_stempel" });

      // Erster Bonus
      if (totalRedemptions >= 1) newBadges.push({ key: "erster_bonus" });

      // Punktesammler: 500+ total stamps
      if (totalStamps >= 500) newBadges.push({ key: "punkt_sammler" });

      // Rakete: 300+ end customers
      if (loyaltyAccounts.length >= 300) newBadges.push({ key: "rakete" });

      // Stammkundenring: 8+ customers with 6+ stamps
      // VIP-Stammkunde: 5+ customers with 15+ stamps
      if (loyaltyAccounts.length > 0) {
        const stampCounts: number[] = [];
        // Batch in groups of 50
        for (let i = 0; i < loyaltyAccounts.length; i += 50) {
          const batch = loyaltyAccounts.slice(i, i + 50);
          const results = await Promise.all(
            batch.map(acc =>
              supabase.from("point_transactions").select("*", { count: "exact", head: true })
                .eq("merchant_customer_id", customerId)
                .eq("loyalty_account_id", acc.id)
                .eq("transaction_type", "nfc_stamp")
            )
          );
          results.forEach(r => stampCounts.push(r.count || 0));
        }
        const stammkunden = stampCounts.filter(c => c >= 6).length;
        const vipKunden = stampCounts.filter(c => c > 15).length;
        if (stammkunden >= 8) newBadges.push({ key: "stammkunden_ring" });
        if (vipKunden >= 5) newBadges.push({ key: "vip_stammkunde" });
      }

      // Netzwerkstar: 3+ merchants in same PLZ
      if (networkCount >= 3) newBadges.push({ key: "netzwerk_star", metadata: { count: networkCount } });

      // Treueschild: 6 months
      if (customerCreatedAt) {
        const created = new Date(customerCreatedAt);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        if (created <= sixMonthsAgo) newBadges.push({ key: "treue_schild" });
      }

      // Jubiläum: 1 year
      if (customerCreatedAt) {
        const created = new Date(customerCreatedAt);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (created <= oneYearAgo) newBadges.push({ key: "jubilaeum" });
      }

      // Geburtstagskind: birthday_enabled + at least one birthday transaction
      if (birthdayEnabled) {
        const { count: birthdayTx } = await supabase.from("point_transactions")
          .select("*", { count: "exact", head: true })
          .eq("merchant_customer_id", customerId)
          .eq("transaction_type", "birthday_bonus");
        if ((birthdayTx || 0) >= 1) newBadges.push({ key: "geburtstagskind" });
      }

      // Stimme erhoben: google review claims >= 1
      if (googleReviews >= 1) newBadges.push({ key: "stimme_erhoben" });

      // Award new badges
      for (const badge of newBadges) {
        if (!earnedBadges[badge.key]) {
          await awardBadge(badge.key, badge.metadata || {});
        }
      }

      // Reload
      if (newBadges.some(b => !earnedBadges[b.key])) {
        await loadBadges();
      }
    } catch (e) {
      console.error("Badge check error:", e);
    }
  };

  const earned = BADGE_DEFS.filter(b => earnedBadges[b.key]);
  if (earned.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 mt-4 flex-wrap">
      {earned.map(badge => (
        <Tooltip key={badge.key}>
          <TooltipTrigger asChild>
            <img
              src={badge.icon}
              alt={badge.label}
              className="w-9 h-9 rounded-full cursor-pointer hover:scale-110 transition-transform duration-200 drop-shadow-sm"
            />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[220px] text-xs leading-relaxed">
            <p className="font-semibold">{badge.label}</p>
            <p className="text-muted-foreground">{badge.getTooltip(earnedBadges[badge.key]?.metadata)}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

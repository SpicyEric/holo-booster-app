import { useEffect, useState } from "react";
import { isDemoMerchantActive, onDemoMerchantChange } from "@/lib/demoMerchant";

export function useDemoMerchant(): boolean {
  const [active, setActive] = useState<boolean>(() => isDemoMerchantActive());

  useEffect(() => {
    const update = () => setActive(isDemoMerchantActive());
    update();
    return onDemoMerchantChange(update);
  }, []);

  return active;
}

const MERCHANT_SETUP_HANDLED_PREFIX = "merchant-setup-handled";

const getMerchantSetupKey = (customerId: string) =>
  `${MERCHANT_SETUP_HANDLED_PREFIX}:${customerId}`;

export const isMerchantSetupHandled = (customerId: string) => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(getMerchantSetupKey(customerId)) === "true";
};

export const markMerchantSetupHandled = (customerId: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(getMerchantSetupKey(customerId), "true");
};

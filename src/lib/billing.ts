export const TRIAL_DAYS = 14;

export function isTrialActive(user: { trialEndsAt?: Date | null } | null | undefined): boolean {
  return !!user?.trialEndsAt && user.trialEndsAt.getTime() > Date.now();
}

export function isPremium(user: { subscriptionStatus?: string | null; trialEndsAt?: Date | null } | null | undefined): boolean {
  return user?.subscriptionStatus === "ACTIVE" || isTrialActive(user);
}

export function trialDaysRemaining(user: { trialEndsAt?: Date | null } | null | undefined): number {
  if (!user?.trialEndsAt) return 0;
  const ms = user.trialEndsAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

export function maxMultiViewTiles(user: { subscriptionStatus?: string | null; trialEndsAt?: Date | null } | null | undefined): 4 | 9 {
  return isPremium(user) ? 9 : 4;
}

export const PLANS = [
  {
    name: "Free Trial", price: "Free", cadence: "14 days", status: "Available",
    features: ["2 streaming stations", "Tournament Control Room", "YouTube Live integration", "Match → station assignment", "Public tournament pages", "Basic branding"],
  },
  {
    name: "Starter", price: "₹1,499", cadence: "/month", status: "Coming Soon",
    features: ["Up to 5 stations", "Unlimited tournaments", "Control Room", "OBS / stream monitoring", "Custom branding", "Match VOD association", "Multiple operators"],
  },
  {
    name: "Pro", price: "₹3,999", cadence: "/month", status: "Coming Soon",
    features: ["Up to 10 stations", "Everything in Starter", "Advanced event controls", "Sponsor branding", "Advanced stream monitoring", "VOD management", "Event analytics", "Multiple tournament operators"],
  },
  {
    name: "Event Package", price: "₹7,500–₹25,000", cadence: "/event", status: "Coming Soon",
    features: ["One-off tournament deployment", "Multiple stations", "Custom event branding", "Broadcast setup", "Operator support"],
  },
] as const;

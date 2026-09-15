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

export function maxMultiViewTiles(user: { subscriptionStatus?: string | null; trialEndsAt?: Date | null }): 4 | 9 {
  return isPremium(user) ? 9 : 4;
}

export const PLANS = [
  {
    name: "Free Trial", price: "Free", cadence: "14 days", status: "Available",
    description: "Run a real tournament before you commit.",
    features: ["Up to 2 stations", "Tournament setup, participants & brackets", "Schedule + station assignment", "Control Room + rundown", "YouTube Live connection", "Saved RTMP destinations", "Broadcast/HUD + Multiview", "Public tournament pages"],
  },
  {
    name: "Organizer", price: "₹1,499", cadence: "/month", status: "Coming Soon",
    description: "For organizers running tournaments regularly.",
    features: ["Up to 5 stations", "Unlimited tournaments", "Everything in Free Trial", "YouTube + Kick/custom RTMP workflow", "Station streaming credentials", "Multi-operator workspace", "Custom event branding", "Priority support"],
  },
  {
    name: "Pro", price: "₹3,999", cadence: "/month", status: "Coming Soon",
    description: "For clubs, venues and recurring tournament operations.",
    features: ["Up to 12 stations", "Everything in Organizer", "Advanced broadcast controls", "Reusable event configuration", "Sponsor/brand presentation", "Larger operator teams", "Higher event-day support level"],
  },
  {
    name: "Event", price: "₹7,500", cadence: "/event", status: "Coming Soon",
    description: "A full event without a monthly commitment.",
    features: ["Up to 16 stations", "Full tournament operations", "Broadcast setup", "YouTube + RTMP destinations", "Control Room + Multiview", "Event branding", "Event-day operator support", "Larger events quoted separately"],
  },
  {
    name: "Enterprise", price: "Custom", cadence: "annual / event", status: "Contact Us",
    description: "For leagues, venues and production companies.",
    features: ["Custom station capacity", "Multiple organizations / teams", "Dedicated support", "Custom integrations", "Commercial terms", "Multi-event operations"],
  },
] as const;

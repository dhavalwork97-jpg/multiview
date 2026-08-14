import type { PlanTier } from "@prisma/client";
export const PLAN_LIMITS: Record<PlanTier,{stations:number;tournaments:number;operators:number;analytics:boolean;branding:boolean;sponsors:boolean}> = {
  FREE:{stations:2,tournaments:2,operators:1,analytics:false,branding:true,sponsors:false},
  STARTER:{stations:5,tournaments:1000,operators:5,analytics:true,branding:true,sponsors:false},
  PRO:{stations:10,tournaments:1000,operators:50,analytics:true,branding:true,sponsors:true},
  ENTERPRISE:{stations:1000,tournaments:100000,operators:1000,analytics:true,branding:true,sponsors:true},
};
export function planAllows(plan: PlanTier,key:keyof typeof PLAN_LIMITS[PlanTier]){return PLAN_LIMITS[plan][key];}

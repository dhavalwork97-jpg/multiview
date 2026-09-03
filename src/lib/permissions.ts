export const Roles={OWNER:"owner",ADMIN:"admin",ORGANIZER:"organizer",PLAYER:"player"} as const;
export type Role=(typeof Roles)[keyof typeof Roles];
export const hasRole=(role:string,allowed:Role[])=>allowed.includes(role as Role);
export const canManageTournament=(role:string)=>hasRole(role,[Roles.OWNER,Roles.ADMIN,Roles.ORGANIZER]);

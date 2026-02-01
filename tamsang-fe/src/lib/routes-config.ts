export const protectedRoutes = [
  '/profile',
  '/dashboard',
  '/campaign-manager',
  '/admin',
];

export const publicRoutes = [
  '/login',
  '/register',
  '/',
  '/campaigns', // Public viewing of campaigns
];

export const roleRoutes: Record<string, string> = {
  ADMIN: '/admin',
  ORGANIZER: '/campaign-manager',
  DONOR: '/profile',
};

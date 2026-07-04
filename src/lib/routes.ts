// src/lib/routes.ts
// Single source of truth for all application route paths.
// Import ROUTES everywhere — never hardcode path strings.

export const ROUTES = {
  // Public
  landing: '/',
  login: '/login',
  signup: '/signup',

  // Authenticated — app shell
  dashboard: '/dashboard',
  bugRefiner: '/bug-refiner',
  testGenerator: '/test-generator',
  writingAssistant: '/writing-assistant',
  settings: '/settings',

  qaReport: '/qa-report',
  reportPreview: '/report-preview',

  // AI News
  aiNews: '/ai-news',

  // Announcements
  announcements: '/announcements',
  adminAnnouncements: '/admin/announcements',

  // Lazy Panda Config (super_admin only)
  adminPanda: '/admin/panda',

  // Event & Greetings (super_admin only)
  adminEvents: '/admin/events',

  // Admin only
  admin: '/admin',
  adminUsers: '/admin/users',
  adminAI: '/admin/ai-providers',
  adminPermissions: '/admin/permissions',

  // Enterprise RBAC
  enterprise: '/admin/enterprise',
  enterpriseUsers: '/admin/enterprise/users',
  enterpriseRoles: '/admin/enterprise/roles',
  enterpriseTemplates: '/admin/enterprise/templates',
  enterpriseAudit: '/admin/enterprise/audit',

  // Daily Update Report & Config
  dailyReport: '/daily-report',
  dailyReportConfig: '/daily-report/configuration',

  // QA Weekly Report Config
  qaReportConfig: '/qa-report/configuration',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

/** Map a route path back to the RBAC module key used by usePermissions */
export const ROUTE_MODULE_KEY: Partial<Record<AppRoute, string>> = {
  [ROUTES.dashboard]: 'dashboard',
  [ROUTES.bugRefiner]: 'bug-refiner',
  [ROUTES.testGenerator]: 'test-generator',
  [ROUTES.writingAssistant]: 'writing-assistant',
  [ROUTES.qaReport]: 'qa-report',
  [ROUTES.qaReportConfig]: 'qa-report',
  [ROUTES.reportPreview]: 'qa-report',
  [ROUTES.settings]: 'settings',
  [ROUTES.announcements]: 'announcements',
  [ROUTES.adminAnnouncements]: 'admin',
  [ROUTES.admin]: 'admin',
  [ROUTES.adminUsers]: 'admin',
  [ROUTES.adminAI]: 'admin',
  [ROUTES.adminPermissions]: 'admin',
  [ROUTES.enterprise]: 'admin',
  [ROUTES.enterpriseUsers]: 'admin',
  [ROUTES.enterpriseRoles]: 'admin',
  [ROUTES.enterpriseTemplates]: 'admin',
  [ROUTES.enterpriseAudit]: 'admin',
  [ROUTES.dailyReport]: 'daily-report',
  [ROUTES.dailyReportConfig]: 'daily-report',
}


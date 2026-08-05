// src/lib/routes.ts
// Single source of truth for all application route paths.
// Import ROUTES everywhere — never hardcode path strings.

export const ROUTES = {
  // Public
  landing: '/',
  login: '/login',
  signup: '/signup',
  maintenance: '/maintenance',
  qalyAiEngine404: '/qalyaiengine-404',
  qalyAiEngine401: '/qalyaiengine-401',

  // Authenticated — app shell
  dashboard: '/dashboard',
  projectHub: '/project-hub',
  bugRefiner: '/bug-refiner',
  testGenerator: '/test-generator',
  writingAssistant: '/writing-assistant',
  settings: '/settings',

  qaReport: '/qa-report',
  reportPreview: '/report-preview',

  // AI News
  aiNews: '/ai-news',

  // Announcements (Admin-only, no standalone route)
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
  enterpriseMaintenance: '/admin/enterprise/maintenance',
  enterpriseAI: '/admin/enterprise/ai',
  enterprisePanda: '/admin/enterprise/panda',
  enterpriseTeams: '/admin/enterprise/teams',

  // Daily Update Report (the centralized Configuration page/route was
  // removed — Support & Exception Log / Release Testing Log now manage
  // their own dropdown options per-column via the Customize Columns drawer)
  dailyReport: '/daily-report',

  // QA Weekly Report Config
  qaReportConfig: '/qa-report/configuration', // Project Configurations (name/code/description/status)
  qaReportDropdownConfig: '/qa-report/dropdown-configuration', // Testing Status / Priority master dropdown lists
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

/** Map a route path back to the RBAC module key used by usePermissions */
export const ROUTE_MODULE_KEY: Partial<Record<AppRoute, string>> = {
  [ROUTES.dashboard]: 'dashboard',
  [ROUTES.projectHub]: 'project-hub',
  [ROUTES.bugRefiner]: 'bug-refiner',
  [ROUTES.testGenerator]: 'test-generator',
  [ROUTES.writingAssistant]: 'writing-assistant',
  [ROUTES.qaReport]: 'qa-report',
  [ROUTES.qaReportConfig]: 'qa-report',
  [ROUTES.qaReportDropdownConfig]: 'qa-report',
  [ROUTES.reportPreview]: 'qa-report',
  [ROUTES.settings]: 'settings',
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
  [ROUTES.enterpriseMaintenance]: 'admin',
  [ROUTES.enterpriseAI]: 'admin',
  [ROUTES.enterprisePanda]: 'admin',
  [ROUTES.enterpriseTeams]: 'admin',
  [ROUTES.dailyReport]: 'daily-report',
}


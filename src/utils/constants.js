export const ROLES = {
  super_admin: { label: 'Super Admin', color: 'bg-primary/10 text-primary' },
  org_admin:   { label: 'Org Admin',   color: 'bg-secondary/20 text-teal-700' },
  instructor:  { label: 'Instructor',  color: 'bg-purple-100 text-purple-700' },
  learner:     { label: 'Learner',     color: 'bg-gray-100 text-gray-600' },
};

export const COURSE_STATUS = {
  pending:  { label: 'Pending Review', color: 'bg-warning/15 text-yellow-700' },
  approved: { label: 'Approved',       color: 'bg-success/15 text-green-700' },
  rejected: { label: 'Rejected',       color: 'bg-danger/15 text-red-700' },
};

export const COURSE_VISIBILITY = {
  public:   { label: 'Public',   color: 'bg-success/10 text-green-700' },
  unlisted: { label: 'Unlisted', color: 'bg-warning/10 text-yellow-700' },
  private:  { label: 'Private',  color: 'bg-gray-100 text-gray-500' },
};

export const DIFFICULTY = {
  Beginner:     { label: 'Beginner',     color: 'bg-green-100 text-green-700' },
  Intermediate: { label: 'Intermediate', color: 'bg-yellow-100 text-yellow-700' },
  Advanced:     { label: 'Advanced',     color: 'bg-red-100 text-red-700' },
};

export const NAV_ITEMS = [
  { path: '/dashboard',       label: 'Dashboard',      icon: 'LayoutDashboard', roles: null },
  { path: '/studio',          label: 'Studio',         icon: 'Clapperboard',    roles: ['org_admin', 'instructor'] },
  { path: '/users',           label: 'Users',          icon: 'Users',           roles: ['super_admin', 'org_admin'] },
  { path: '/organizations',   label: 'Organizations',  icon: 'Building2',       roles: ['super_admin'] },
  { path: '/my-organization', label: 'My Organization',icon: 'Building2',       roles: ['org_admin', 'instructor'] },
  { path: '/courses',         label: 'Courses',        icon: 'BookOpen',        roles: null },
  { path: '/categories',      label: 'Categories',     icon: 'Tags',            roles: ['super_admin'] },
  { path: '/analytics',       label: 'Analytics',      icon: 'BarChart2',       roles: ['super_admin', 'org_admin'] },
  { path: '/audit',           label: 'Audit Logs',     icon: 'ScrollText',      roles: ['super_admin'] },
  { path: '/announcements',   label: 'Announcements',  icon: 'Megaphone',       roles: ['super_admin'] },
  { path: '/settings',        label: 'Settings',       icon: 'Settings',        roles: null },
];

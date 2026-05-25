import { z } from 'zod'

// ── Reusable field rules ───────────────────────────────────────────────────

const phoneRule = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^\+?[\d\s\-()+]{7,20}$/, 'Enter a valid phone number (e.g. +251912345678)')

const usernameRule = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers and underscores allowed')

// Empty string → treated as absent; non-empty → validated as URL
const optionalUrl = z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.string().url('Must be a valid URL starting with https://').optional(),
)

// Empty string → treated as absent; non-empty → validated as email
const optionalEmail = z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.string().email('Enter a valid email address').optional(),
)

// ── Schemas ────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

export const createUserSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  username:  usernameRule,
  phone:     phoneRule,
  email:     optionalEmail,
  role:      z.enum(['instructor', 'org_admin']),
  org_id:    z.string().min(1, 'Please select an organization'),
})

export const createOrgSchema = z.object({
  name:        z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  website:     optionalUrl,
  logo_url:    optionalUrl,
})

export const createOrgAdminSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  username:  usernameRule,
  phone:     phoneRule,
  email:     z.string().min(1, 'Email is required').email('Enter a valid email address'),
})

export const announcementSchema = z.object({
  title:       z.string().min(1, 'Title is required'),
  body:        z.string().min(1, 'Message body is required'),
  target_role: z.string().optional(),
  expires_at:  z.string().optional(),
})

export const createCategorySchema = z.object({
  id:    z.string()
           .min(1, 'Slug is required')
           .max(50, 'Slug must be at most 50 characters')
           .regex(/^[a-z0-9_-]+$/, 'Slug must be lowercase, alphanumeric, hyphens or underscores'),
  label: z.string().min(1, 'Label is required').max(50, 'Label must be at most 50 characters'),
  icon:  z.string().min(1, 'Icon name is required').max(50, 'Icon name must be at most 50 characters'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g. #FF6B35)'),
})

export const updateCategorySchema = z.object({
  label: z.string().min(1, 'Label is required').max(50, 'Label must be at most 50 characters').optional(),
  icon:  z.string().min(1, 'Icon name is required').max(50, 'Icon name must be at most 50 characters').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g. #FF6B35)').optional(),
})

export const updateUserSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  phone:     phoneRule.optional(),
  email:     optionalEmail,
})

export const reassignOrgSchema = z.object({
  org_id: z.string().min(1, 'Please select an organization'),
})

export const rejectReasonSchema = z.object({
  reason: z.string().min(10, 'Please provide a reason (at least 10 characters)'),
})

export const updateProfileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  bio:       z.string().max(200, 'Bio must be at most 200 characters').optional(),
})

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password:     z.string().min(8, 'New password must be at least 8 characters'),
    confirm_password: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Passwords do not match',
    path:    ['confirm_password'],
  })

// ── Helper: convert a failed safeParse result to a field → message map ────

export function fieldErrors(result) {
  if (result.success) return {}
  const issues = result.error.issues ?? []
  return Object.fromEntries(
    issues
      .filter((issue) => issue.path.length > 0)
      .map((issue) => [issue.path[0], issue.message]),
  )
}

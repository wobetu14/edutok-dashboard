import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Building2, Globe, Calendar, Users, BookOpen,
  Crown, Phone, Mail, PhoneCall, AlertTriangle,
  UserCheck,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { api } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { COURSE_STATUS, COURSE_VISIBILITY, DIFFICULTY } from '@/utils/constants'

const LIMIT = 10

function initials(name = '') {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

const ORG_ROLE_BADGE = {
  org_admin:  'bg-primary/10 text-primary',
  instructor: 'bg-secondary/10 text-secondary-foreground',
}

export default function MyOrganizationPage() {
  const { user: me } = useAuth()
  const [tab, setTab] = useState('members')
  const [coursePage, setCoursePage] = useState(1)

  // Get the org ID from the current user's first membership.
  // Re-fetch /users/me so we're sure org_memberships is present.
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.getMe().then((r) => r.data.data),
    initialData: me?.org_memberships ? me : undefined,
  })

  const orgId = profile?.org_memberships?.[0]?.org?.id

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ['org', orgId],
    queryFn: () => api.getOrg(orgId).then((r) => r.data.data),
    enabled: !!orgId,
  })

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['org-members', orgId],
    queryFn: () => api.listOrgMembers(orgId).then((r) => r.data.data ?? []),
    enabled: !!orgId && tab === 'members',
  })

  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ['org-courses', orgId, coursePage],
    queryFn: () =>
      api.listOrgCourses(orgId, { page: coursePage, limit: LIMIT })
        .then((r) => ({ courses: r.data.data, total: r.data.meta?.total ?? 0 })),
    keepPreviousData: true,
    enabled: !!orgId && tab === 'courses',
  })

  // ── Members table columns ────────────────────────────────────────────────

  const memberColumns = [
    {
      key: 'user',
      label: 'Member',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.user?.avatar_url} alt={row.user?.full_name} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials(row.user?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-foreground">{row.user?.full_name}</p>
            <p className="text-xs text-muted-foreground">@{row.user?.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (row) => (
        <div>
          <p className="text-xs text-foreground">{row.user?.phone ?? '—'}</p>
          {row.user?.email && <p className="text-xs text-muted-foreground">{row.user.email}</p>}
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (row) => (
        <Badge className={`${ORG_ROLE_BADGE[row.role] ?? ''} text-xs capitalize`}>
          {row.role === 'org_admin' ? 'Org Admin' : 'Instructor'}
        </Badge>
      ),
    },
    {
      key: 'joined_at',
      label: 'Joined',
      render: (row) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(row.joined_at).toLocaleDateString()}
        </span>
      ),
    },
  ]

  // ── Courses table columns ────────────────────────────────────────────────

  const courseColumns = [
    {
      key: 'title',
      label: 'Course',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.title}</p>
          <p className="text-xs text-muted-foreground">{row.category}</p>
        </div>
      ),
    },
    {
      key: 'difficulty',
      label: 'Level',
      render: (row) => (
        <Badge color={DIFFICULTY[row.difficulty]?.color}>{row.difficulty}</Badge>
      ),
    },
    {
      key: 'visibility',
      label: 'Visibility',
      render: (row) => (
        <Badge color={COURSE_VISIBILITY[row.visibility]?.color}>
          {COURSE_VISIBILITY[row.visibility]?.label}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge color={COURSE_STATUS[row.status]?.color}>{COURSE_STATUS[row.status]?.label}</Badge>
      ),
    },
    {
      key: 'lessons',
      label: 'Lessons',
      render: (row) => (
        <span className="text-sm text-muted-foreground">{row.lesson_count ?? '—'}</span>
      ),
    },
  ]

  // ── Loading state ────────────────────────────────────────────────────────

  if (profileLoading || orgLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-6 w-48" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!orgId || !org) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
        <Building2 size={36} className="opacity-30" />
        <p className="text-sm">No organization found for your account.</p>
        <p className="text-xs text-muted-foreground">Contact a super admin if this is unexpected.</p>
      </div>
    )
  }

  // ── Page ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page heading ────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">My Organization</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Details and members of the organization you belong to.
        </p>
      </div>

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16 rounded-xl flex-shrink-0">
          <AvatarImage src={org.logo_url} alt={org.name} className="object-cover" />
          <AvatarFallback className="bg-secondary/20 text-secondary text-xl font-bold rounded-xl">
            {initials(org.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-foreground">{org.name}</h2>
            {org.is_active
              ? <Badge className="bg-success/15 text-success border-success/20 text-xs">Active</Badge>
              : <Badge className="bg-destructive/15 text-destructive border-destructive/20 text-xs">Suspended</Badge>
            }
          </div>

          {org.website && (
            <a
              href={org.website} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline mt-0.5 w-fit"
            >
              <Globe size={12} />
              {org.website}
            </a>
          )}

          {!org.is_active && org.suspended_reason && (
            <div className="flex items-start gap-1.5 mt-2 text-xs text-destructive">
              <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
              <span>{org.suspended_reason}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Users}    label="Members" value={org.member_count ?? members.length} />
        <StatCard icon={BookOpen} label="Courses" value={org.course_count ?? '—'} />
        <StatCard icon={Calendar} label="Created" value={new Date(org.created_at).toLocaleDateString()} />
        <StatCard icon={Crown}    label="Founder"  value={org.owner?.full_name ?? '—'} />
      </div>

      {/* ── About ───────────────────────────────────────────────────────── */}
      {org.description && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">About</p>
            <p className="text-sm text-foreground leading-relaxed">{org.description}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Contact information ─────────────────────────────────────────── */}
      {(org.mobile || org.telephone || org.email) && (
        <Card>
          <CardContent className="p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact Information</p>
            <div className="flex flex-col gap-2">
              {org.mobile && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone size={14} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground w-20 text-xs">Mobile</span>
                  <a href={`tel:${org.mobile}`} className="text-foreground hover:text-primary transition-colors">{org.mobile}</a>
                </div>
              )}
              {org.telephone && (
                <div className="flex items-center gap-2 text-sm">
                  <PhoneCall size={14} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground w-20 text-xs">Telephone</span>
                  <a href={`tel:${org.telephone}`} className="text-foreground hover:text-primary transition-colors">{org.telephone}</a>
                </div>
              )}
              {org.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail size={14} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground w-20 text-xs">Email</span>
                  <a href={`mailto:${org.email}`} className="text-foreground hover:text-primary transition-colors">{org.email}</a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Owner card ──────────────────────────────────────────────────── */}
      {org.owner && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <UserCheck size={16} className="text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Organization Founder</p>
              <p className="text-sm font-semibold text-foreground">{org.owner.full_name}</p>
              <p className="text-xs text-muted-foreground">@{org.owner.username}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Members / Courses tabs ──────────────────────────────────────── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="members" className="gap-2">
            <Users size={14} />
            Members {members.length > 0 && `(${members.length})`}
          </TabsTrigger>
          <TabsTrigger value="courses" className="gap-2">
            <BookOpen size={14} />
            Courses {org.course_count > 0 && `(${org.course_count})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-3">
          <Card>
            <DataTable
              columns={memberColumns}
              rows={members}
              isLoading={membersLoading}
              emptyMessage="No members yet."
              page={1}
              total={members.length}
              limit={members.length || 10}
              onPageChange={() => {}}
            />
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="mt-3">
          <Card>
            <DataTable
              columns={courseColumns}
              rows={coursesData?.courses ?? []}
              isLoading={coursesLoading}
              emptyMessage="No published courses yet."
              page={coursePage}
              total={coursesData?.total ?? 0}
              limit={LIMIT}
              onPageChange={setCoursePage}
            />
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  )
}

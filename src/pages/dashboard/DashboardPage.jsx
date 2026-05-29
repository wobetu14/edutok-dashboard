import { useQuery } from '@tanstack/react-query'
import {
  Users, BookOpen, Building2, GraduationCap, TrendingUp,
  Clock, AlertTriangle, CheckCircle2, FileEdit, Clapperboard,
  Heart, Bookmark, MessageCircle, CornerDownRight, Share2,
  UserCheck, GraduationCap as Grad, BarChart2,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { api } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { COURSE_STATUS } from '@/utils/constants'

// ── Shared constants ──────────────────────────────────────────────────────────

const CHART_COLORS = ['#FE2C55', '#25F4EE', '#6C63FF', '#F59E0B', '#10B981', '#EC4899']

const tooltipStyle = {
  contentStyle: {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 8,
    fontSize: 12,
  },
}

function formatCount(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function EnrollmentTrend({ data, loading }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-primary" />
          <CardTitle className="text-sm font-semibold">Enrollments — last 7 days</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-[160px] w-full" /> :
         data?.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip {...tooltipStyle} />
              <Line type="monotone" dataKey="count" stroke="#FE2C55" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">No enrollments in the last 7 days</div>
        )}
      </CardContent>
    </Card>
  )
}

function RecentEnrollments({ enrollments, loading }) {
  return (
    <Card>
      <CardHeader className="pb-0 border-b border-border">
        <div className="flex items-center gap-2 pb-3">
          <GraduationCap size={15} className="text-primary" />
          <CardTitle className="text-sm font-semibold">Recent Enrollments</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 flex flex-col gap-2">
            {[0,1,2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : !enrollments?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">No enrollments yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {enrollments.map((e, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                {e.user?.avatar_url ? (
                  <img src={e.user.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {e.user?.full_name?.[0] ?? '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{e.user?.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{e.course?.title}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                  {new Date(e.enrolled_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Role sub-components ───────────────────────────────────────────────────────

function SuperAdminDashboard({ user }) {
  const { data, isLoading } = useQuery({
    queryKey: ['sa-dashboard'],
    queryFn: () => api.stats().then((r) => r.data.data),
  })
  const s = data ?? {}

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Welcome back, {user?.full_name?.split(' ')[0]}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Platform overview across all organizations.</p>
      </div>

      {/* Primary stats — 4 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Students"       value={s.total_students}   icon={GraduationCap} color="text-primary"    loading={isLoading} index={0} />
        <StatCard label="Staff"          value={s.total_staff}      icon={UserCheck}     color="text-secondary"  loading={isLoading} index={1} />
        <StatCard label="Organizations"  value={s.total_orgs}       icon={Building2}     color="text-purple-500" loading={isLoading} index={2} />
        <StatCard label="Total Courses"  value={s.total_courses}    icon={BookOpen}      color="text-success"    loading={isLoading} index={3} />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Enrollments"    value={s.total_enrollments} icon={Users}        color="text-primary"    loading={isLoading} index={0} />
        <StatCard label="Completions"    value={s.total_completions} icon={CheckCircle2} color="text-success"    loading={isLoading} index={1} />
        <StatCard label="Active Today"   value={s.active_today}      icon={TrendingUp}   color="text-amber-500"  loading={isLoading} index={2} />
        <StatCard label="Pending Review" value={s.pending_courses}   icon={Clock}        color="text-warning"    loading={isLoading} index={3} />
      </div>

      {/* Badges row */}
      {!isLoading && (
        <div className="flex flex-wrap gap-2">
          <Badge color="bg-destructive/10 text-destructive">{s.open_reports ?? 0} open reports</Badge>
          <Badge color="bg-muted text-muted-foreground">{s.total_lessons ?? 0} total lessons</Badge>
          <Badge color="bg-success/10 text-success">{s.courses_by_status?.approved ?? 0} approved courses</Badge>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EnrollmentTrend data={s.enrollment_trend} loading={isLoading} />

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BookOpen size={15} className="text-secondary" />
              <CardTitle className="text-sm font-semibold">Courses by Category</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[160px] w-full" /> :
             s.courses_by_category?.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={s.courses_by_category.slice(0, 8)}>
                  <XAxis dataKey="category" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="count" fill="#25F4EE" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">No data</div>}
          </CardContent>
        </Card>
      </div>

      {/* Course status + Recent enrollments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart2 size={15} className="text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Courses by Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[140px] w-full" /> : (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Approved', value: s.courses_by_status?.approved ?? 0, color: 'bg-success/15 text-green-700' },
                  { label: 'Pending',  value: s.courses_by_status?.pending  ?? 0, color: 'bg-warning/15 text-yellow-700' },
                  { label: 'Draft',    value: s.courses_by_status?.draft    ?? 0, color: 'bg-muted text-muted-foreground' },
                  { label: 'Rejected', value: s.courses_by_status?.rejected ?? 0, color: 'bg-destructive/10 text-destructive' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <Badge color={item.color}>{item.value}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <RecentEnrollments enrollments={s.recent_enrollments} loading={isLoading} />
      </div>
    </div>
  )
}

function OrgAdminDashboard({ user }) {
  const { data, isLoading } = useQuery({
    queryKey: ['org-dashboard'],
    queryFn: () => api.orgDashboard().then((r) => r.data.data),
  })
  const s = data ?? {}

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Welcome back, {user?.full_name?.split(' ')[0]}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Your organization's performance at a glance.</p>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Org Members"  value={s.members}      icon={UserCheck}     color="text-primary"    loading={isLoading} index={0} />
        <StatCard label="Students"     value={s.students}     icon={GraduationCap} color="text-secondary"  loading={isLoading} index={1} />
        <StatCard label="Enrollments"  value={s.enrollments}  icon={Users}         color="text-purple-500" loading={isLoading} index={2} />
        <StatCard label="Completions"  value={s.completions}  icon={CheckCircle2}  color="text-success"    loading={isLoading} index={3} />
      </div>

      {/* Course status breakdown */}
      {!isLoading && s.courses_by_status && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Approved Courses', value: s.courses_by_status.approved, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30' },
            { label: 'Pending Review',   value: s.courses_by_status.pending,  color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/30' },
            { label: 'Draft Courses',    value: s.courses_by_status.draft,    color: 'text-muted-foreground', bg: 'bg-muted/40' },
            { label: 'Rejected',         value: s.courses_by_status.rejected, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
          ].map((item) => (
            <Card key={item.label} className={`p-4 ${item.bg}`}>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EnrollmentTrend data={s.enrollment_trend} loading={isLoading} />
        <RecentEnrollments enrollments={s.recent_enrollments} loading={isLoading} />
      </div>
    </div>
  )
}

function InstructorDashboard({ user }) {
  const { data, isLoading } = useQuery({
    queryKey: ['instructor-dashboard'],
    queryFn: () => api.instructorDashboard().then((r) => r.data.data),
  })
  const s = data ?? {}
  const eng = s.engagement ?? {}

  const statusItems = [
    { label: 'Approved', value: s.courses_by_status?.approved ?? 0, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30' },
    { label: 'Pending',  value: s.courses_by_status?.pending  ?? 0, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/30' },
    { label: 'Draft',    value: s.courses_by_status?.draft    ?? 0, color: 'text-muted-foreground', bg: 'bg-muted/40' },
    { label: 'Rejected', value: s.courses_by_status?.rejected ?? 0, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Welcome back, {user?.full_name?.split(' ')[0]}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Your teaching activity and student progress.</p>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Courses"   value={s.courses_total}  icon={Clapperboard}  color="text-primary"    loading={isLoading} index={0} />
        <StatCard label="Students"     value={s.students}       icon={GraduationCap} color="text-secondary"  loading={isLoading} index={1} />
        <StatCard label="Lessons"      value={s.lessons_total}  icon={BookOpen}      color="text-purple-500" loading={isLoading} index={2} />
        <StatCard label="Completions"  value={s.completions}    icon={CheckCircle2}  color="text-success"    loading={isLoading} index={3} />
      </div>

      {/* Course status chips */}
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statusItems.map((item) => (
            <Card key={item.label} className={`p-4 ${item.bg}`}>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Engagement totals */}
      {!isLoading && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-primary" />
              <CardTitle className="text-sm font-semibold">Total Engagement Across All Lessons</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Likes',    value: eng.likes,    Icon: Heart,           color: 'text-rose-500',   bg: 'bg-rose-50 dark:bg-rose-950/30' },
                { label: 'Saves',    value: eng.saves,    Icon: Bookmark,        color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-950/30' },
                { label: 'Comments', value: eng.comments, Icon: MessageCircle,   color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-950/30' },
                { label: 'Replies',  value: eng.replies,  Icon: CornerDownRight, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
                { label: 'Shares',   value: eng.shares,   Icon: Share2,          color: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-950/30' },
              ].map(({ label, value, Icon, color, bg }) => (
                <div key={label} className={`flex flex-col items-center gap-1 py-3 px-2 rounded-lg border border-border ${bg}`}>
                  <Icon size={15} className={color} />
                  <span className="text-xl font-bold text-foreground tabular-nums">{formatCount(value ?? 0)}</span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enrollment trend + Recent enrollments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EnrollmentTrend data={s.enrollment_trend} loading={isLoading} />
        <RecentEnrollments enrollments={s.recent_enrollments} loading={isLoading} />
      </div>

      {/* Per-course breakdown */}
      {!isLoading && s.course_breakdown?.length > 0 && (
        <Card>
          <CardHeader className="pb-0 border-b border-border">
            <div className="flex items-center gap-2 pb-3">
              <Clapperboard size={15} className="text-primary" />
              <CardTitle className="text-sm font-semibold">Course Performance</CardTitle>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Course</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground">Lessons</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground">Students</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground">Completions</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Rate</th>
                </tr>
              </thead>
              <tbody>
                {s.course_breakdown.map((course) => (
                  <tr key={course.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{course.title}</p>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Badge color={COURSE_STATUS[course.status]?.color} className="text-xs">
                        {COURSE_STATUS[course.status]?.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">{course.lesson_count}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">{course.enrollments}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">{course.completions}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-semibold ${course.completion_rate >= 70 ? 'text-green-600' : course.completion_rate >= 30 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                        {course.completion_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

// ── Main router ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()

  if (user?.role === 'super_admin') return <SuperAdminDashboard user={user} />
  if (user?.role === 'org_admin')   return <OrgAdminDashboard   user={user} />
  if (user?.role === 'instructor')  return <InstructorDashboard user={user} />

  return (
    <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
      <BookOpen size={36} className="opacity-30" />
      <p className="text-sm">Dashboard not available for your role.</p>
    </div>
  )
}

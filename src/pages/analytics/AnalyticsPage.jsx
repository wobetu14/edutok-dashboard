import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { api } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import {
  Users, BookOpen, GraduationCap, TrendingUp, Clapperboard,
  CheckCircle2, Heart, Bookmark, MessageCircle, CornerDownRight,
  Share2, ChevronUp, ChevronDown,
} from 'lucide-react'
import { COURSE_STATUS } from '@/utils/constants'
import { cn } from '@/lib/utils'

// ── Shared ────────────────────────────────────────────────────────────────────

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

function NoData({ height = 180 }) {
  return (
    <div
      className="flex items-center justify-center text-muted-foreground text-sm"
      style={{ height }}
    >
      No data yet
    </div>
  )
}

// Truncates long course names for axis labels
function shortName(name = '', max = 18) {
  return name.length > max ? name.slice(0, max) + '…' : name
}

// ── Super Admin / Org Admin analytics (existing) ──────────────────────────────

function StaffAnalytics({ user }) {
  const [orgId, setOrgId] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['org-stats', orgId],
    queryFn:  () => api.orgStats(orgId || undefined).then((r) => r.data.data),
  })
  const stats = data ?? {}

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Analytics</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {user?.role === 'super_admin' ? 'Platform-wide statistics.' : 'Your organization statistics.'}
        </p>
      </div>

      {user?.role === 'super_admin' && (
        <div className="flex gap-3 items-center max-w-xs">
          <Label className="whitespace-nowrap text-sm">Filter by Org ID</Label>
          <Input
            placeholder="Leave blank for platform-wide"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
          />
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Instructors"   value={stats.total_instructors} icon={Users}         color="text-primary"    loading={isLoading} index={0} />
        <StatCard label="Total Courses" value={stats.total_courses}     icon={BookOpen}      color="text-secondary"  loading={isLoading} index={1} />
        <StatCard label="Enrollments"   value={stats.total_enrollments} icon={GraduationCap} color="text-purple-500" loading={isLoading} index={2} />
        <StatCard label="Completions"   value={stats.total_completions} icon={TrendingUp}    color="text-success"    loading={isLoading} index={3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Courses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[200px] w-full" /> :
             stats.coursesByCategory?.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.coursesByCategory}>
                  <XAxis dataKey="category" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="count" fill="#FE2C55" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <NoData />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top Enrolled Courses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[200px] w-full" /> :
             stats.topCourses?.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stats.topCourses}
                    dataKey="enrollments"
                    nameKey="title"
                    cx="50%" cy="50%"
                    outerRadius={70}
                  >
                    {stats.topCourses.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <NoData />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ── Instructor analytics ──────────────────────────────────────────────────────

function SortableTable({ courses }) {
  const [sortKey, setSortKey] = useState('enrollments')
  const [sortDir, setSortDir] = useState('desc')

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ col }) =>
    sortKey === col
      ? sortDir === 'desc'
        ? <ChevronDown size={12} className="text-primary" />
        : <ChevronUp size={12} className="text-primary" />
      : null

  const sorted = useMemo(() => {
    return [...courses].sort((a, b) => {
      let aVal, bVal
      if (sortKey === 'completion_rate') { aVal = a.completion_rate; bVal = b.completion_rate }
      else if (sortKey === 'completions') { aVal = a.completions; bVal = b.completions }
      else if (sortKey === 'lesson_count') { aVal = a.lesson_count; bVal = b.lesson_count }
      else if (sortKey === 'engagement') {
        const sum = (e) => (e.likes ?? 0) + (e.saves ?? 0) + (e.comments ?? 0) + (e.replies ?? 0) + (e.shares ?? 0)
        aVal = sum(a.engagement ?? {}); bVal = sum(b.engagement ?? {})
      } else { aVal = a.enrollments; bVal = b.enrollments }
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal
    })
  }, [courses, sortKey, sortDir])

  const cols = [
    { key: 'enrollments',    label: 'Students' },
    { key: 'lesson_count',   label: 'Lessons' },
    { key: 'completions',    label: 'Completions' },
    { key: 'completion_rate', label: 'Completion Rate' },
    { key: 'engagement',     label: 'Engagement' },
  ]

  return (
    <Card>
      <CardHeader className="pb-0 border-b border-border">
        <div className="flex items-center gap-2 pb-3">
          <Clapperboard size={15} className="text-primary" />
          <CardTitle className="text-sm font-semibold">Course Performance — click column to sort</CardTitle>
        </div>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Course</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground">Status</th>
              {cols.map(({ key, label }) => (
                <th
                  key={key}
                  className="text-right px-3 py-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                  onClick={() => handleSort(key)}
                >
                  <div className="flex items-center justify-end gap-1">
                    {label} <SortIcon col={key} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const eng = c.engagement ?? {}
              const totalEng = (eng.likes ?? 0) + (eng.saves ?? 0) + (eng.comments ?? 0) + (eng.replies ?? 0) + (eng.shares ?? 0)
              return (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{c.title}</p>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Badge color={COURSE_STATUS[c.status]?.color} className="text-xs">
                      {COURSE_STATUS[c.status]?.label}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground font-medium">{c.enrollments}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground">{c.lesson_count}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground">{c.completions}</td>
                  <td className="px-3 py-3 text-right">
                    <span className={cn('text-sm font-semibold',
                      c.completion_rate >= 70 ? 'text-green-600'
                      : c.completion_rate >= 30 ? 'text-yellow-600'
                      : 'text-muted-foreground',
                    )}>
                      {c.completion_rate}%
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground">{formatCount(totalEng)}</td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">
                  No courses yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function InstructorAnalytics({ user }) {
  const { data, isLoading } = useQuery({
    queryKey: ['instructor-analytics'],
    queryFn:  () => api.instructorDashboard().then((r) => r.data.data),
    staleTime: 60_000,
  })
  const s   = data ?? {}
  const eng = s.engagement ?? {}
  const breakdown = s.course_breakdown ?? []

  // Prepare chart data
  const enrollmentChart = breakdown
    .map((c) => ({ name: shortName(c.title), value: c.enrollments }))
    .sort((a, b) => b.value - a.value)

  const completionChart = breakdown
    .map((c) => ({ name: shortName(c.title), value: c.completion_rate }))
    .sort((a, b) => b.value - a.value)

  const engagementChart = breakdown.map((c) => ({
    name:     shortName(c.title),
    Likes:    c.engagement?.likes    ?? 0,
    Saves:    c.engagement?.saves    ?? 0,
    Comments: c.engagement?.comments ?? 0,
    Replies:  c.engagement?.replies  ?? 0,
    Shares:   c.engagement?.shares   ?? 0,
  }))

  const statusPieData = [
    { name: 'Approved', value: s.courses_by_status?.approved ?? 0, color: '#10B981' },
    { name: 'Pending',  value: s.courses_by_status?.pending  ?? 0, color: '#F59E0B' },
    { name: 'Draft',    value: s.courses_by_status?.draft    ?? 0, color: '#6B7280' },
    { name: 'Rejected', value: s.courses_by_status?.rejected ?? 0, color: '#EF4444' },
  ].filter((d) => d.value > 0)

  const chartH = Math.max(180, breakdown.length * 36)

  return (
    <div className="flex flex-col gap-6">

      {/* Page heading */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Instructor Analytics</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Performance breakdown across all your courses and lessons.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Courses"  value={s.courses_total}  icon={Clapperboard}  color="text-primary"    loading={isLoading} index={0} />
        <StatCard label="Students"    value={s.students}       icon={GraduationCap} color="text-secondary"  loading={isLoading} index={1} />
        <StatCard label="Lessons"     value={s.lessons_total}  icon={BookOpen}      color="text-purple-500" loading={isLoading} index={2} />
        <StatCard label="Completions" value={s.completions}    icon={CheckCircle2}  color="text-success"    loading={isLoading} index={3} />
      </div>

      {/* Engagement totals */}
      {isLoading ? (
        <Skeleton className="h-28 w-full" />
      ) : (
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
                <div key={label} className={cn('flex flex-col items-center gap-1 py-3 px-2 rounded-lg border border-border', bg)}>
                  <Icon size={15} className={color} />
                  <span className="text-xl font-bold text-foreground tabular-nums">{formatCount(value ?? 0)}</span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enrollment trend + Course status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-primary" />
              <CardTitle className="text-sm font-semibold">Enrollments — last 7 days</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[180px] w-full" /> :
             s.enrollment_trend?.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={s.enrollment_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip {...tooltipStyle} />
                  <Line type="monotone" dataKey="count" stroke="#FE2C55" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <NoData height={180} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Course Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[180px] w-full" /> :
             statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    outerRadius={65}
                    paddingAngle={3}
                  >
                    {statusPieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <NoData height={180} />}
          </CardContent>
        </Card>
      </div>

      {/* Enrollments per course + Completion rates */}
      {breakdown.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Students per Course</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
                <ResponsiveContainer width="100%" height={chartH}>
                  <BarChart data={enrollmentChart} layout="vertical" margin={{ left: 4, right: 24 }}>
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="value" name="Students" fill="#FE2C55" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Completion Rate per Course (%)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
                <ResponsiveContainer width="100%" height={chartH}>
                  <BarChart data={completionChart} layout="vertical" margin={{ left: 4, right: 24 }}>
                    <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, 'Rate']} />
                    <Bar dataKey="value" name="Rate" fill="#10B981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Engagement breakdown per course */}
      {breakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Heart size={14} className="text-rose-500" />
              <CardTitle className="text-sm font-semibold">Engagement Breakdown per Course</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[220px] w-full" /> : (
              <ResponsiveContainer width="100%" height={Math.max(220, breakdown.length * 44)}>
                <BarChart data={engagementChart} layout="vertical" margin={{ left: 4, right: 8 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip {...tooltipStyle} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Likes"    stackId="a" fill="#FE2C55" />
                  <Bar dataKey="Saves"    stackId="a" fill="#F59E0B" />
                  <Bar dataKey="Comments" stackId="a" fill="#25F4EE" />
                  <Bar dataKey="Replies"  stackId="a" fill="#6C63FF" />
                  <Bar dataKey="Shares"   stackId="a" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sortable full course table */}
      {!isLoading && <SortableTable courses={breakdown} />}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { user } = useAuth()

  if (user?.role === 'instructor') return <InstructorAnalytics user={user} />
  return <StaffAnalytics user={user} />
}

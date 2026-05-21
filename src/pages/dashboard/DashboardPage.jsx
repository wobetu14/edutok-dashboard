import { useQuery } from '@tanstack/react-query'
import { Users, BookOpen, Building2, GraduationCap, TrendingUp, Clock } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { api } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { COURSE_STATUS } from '@/utils/constants'

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: statsData, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.stats().then((r) => r.data.data),
  })

  const { data: pendingData } = useQuery({
    queryKey: ['pending-courses', 1],
    queryFn: () => api.listPending({ page: 1, limit: 5 }).then((r) => r.data.data),
  })

  const stats   = statsData ?? {}
  const pending = pendingData?.courses ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome */}
      <div>
        <h2 className="text-xl font-bold text-foreground">
          Welcome back, {user?.full_name?.split(' ')[0]}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Here's what's happening on EduTok today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users"    value={stats.total_users}       icon={Users}         color="text-primary"    loading={isLoading} index={0} />
        <StatCard label="Organizations"  value={stats.total_orgs}        icon={Building2}     color="text-secondary"  loading={isLoading} index={1} />
        <StatCard label="Courses"        value={stats.total_courses}     icon={BookOpen}      color="text-purple-500" loading={isLoading} index={2} />
        <StatCard label="Enrollments"    value={stats.total_enrollments} icon={GraduationCap} color="text-success"    loading={isLoading} index={3} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              <CardTitle className="text-sm font-semibold">Enrollments (last 7 days)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[180px] w-full" />
            ) : stats.enrollmentTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={stats.enrollmentTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#FE2C55" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                No trend data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-secondary" />
              <CardTitle className="text-sm font-semibold">Courses by Category</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[180px] w-full" />
            ) : stats.coursesByCategory?.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats.coursesByCategory}>
                  <XAxis dataKey="category" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="#25F4EE" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                No category data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending approvals */}
      <Card>
        <CardHeader className="pb-0 border-b border-border">
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-warning" />
              <CardTitle className="text-sm font-semibold">Pending Course Approvals</CardTitle>
            </div>
            {pending.length > 0 && (
              <Badge color="bg-warning/15 text-yellow-700">{pending.length}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No pending courses — all clear!
            </p>
          ) : (
            <div className="divide-y divide-border">
              {pending.map((course) => (
                <div key={course.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{course.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {course.organization?.name} · {course.category}
                    </p>
                  </div>
                  <Badge color={COURSE_STATUS.pending.color}>{COURSE_STATUS.pending.label}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

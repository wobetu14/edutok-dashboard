import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { api } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { Users, BookOpen, GraduationCap, TrendingUp } from 'lucide-react'

const CHART_COLORS = ['#FE2C55', '#25F4EE', '#6C63FF', '#F59E0B', '#10B981', '#EC4899']

const tooltipStyle = {
  contentStyle: {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 8,
    fontSize: 12,
  },
}

export default function AnalyticsPage() {
  const { user }       = useAuth()
  const [orgId, setOrgId] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['org-stats', orgId],
    queryFn: () => api.orgStats(orgId || undefined).then((r) => r.data.data),
  })

  const stats = data ?? {}

  return (
    <div className="flex flex-col gap-6">
      {user?.role === 'super_admin' && (
        <div className="flex gap-3 items-center max-w-xs">
          <Label className="whitespace-nowrap text-sm">Org ID</Label>
          <Input
            placeholder="Leave blank for platform-wide"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
          />
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Instructors"    value={stats.total_instructors} icon={Users}         color="text-primary"    loading={isLoading} />
        <StatCard label="Total Courses"  value={stats.total_courses}     icon={BookOpen}      color="text-secondary"  loading={isLoading} />
        <StatCard label="Enrollments"    value={stats.total_enrollments} icon={GraduationCap} color="text-purple-500" loading={isLoading} />
        <StatCard label="Completions"    value={stats.total_completions} icon={TrendingUp}    color="text-success"    loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Courses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : stats.coursesByCategory?.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.coursesByCategory}>
                  <XAxis dataKey="category" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="count" fill="#FE2C55" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No data
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top Enrolled Courses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : stats.topCourses?.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stats.topCourses}
                    dataKey="enrollments"
                    nameKey="title"
                    cx="50%"
                    cy="50%"
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
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No data
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

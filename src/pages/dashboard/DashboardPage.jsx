import { useQuery } from '@tanstack/react-query';
import { Users, BookOpen, Building2, GraduationCap, TrendingUp, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { StatCard, Card } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { COURSE_STATUS, ROLES } from '../../utils/constants';

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: statsData, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.stats().then((r) => r.data.data),
  });

  const { data: pendingData } = useQuery({
    queryKey: ['pending-courses', 1],
    queryFn: () => api.listPending({ page: 1, limit: 5 }).then((r) => r.data.data),
  });

  const stats = statsData ?? {};
  const pending = pendingData?.courses ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome */}
      <div>
        <h2 className="text-xl font-bold text-ink">
          Welcome back, {user?.full_name?.split(' ')[0]} 👋
        </h2>
        <p className="text-sm text-muted mt-0.5">Here's what's happening on EduTok today.</p>
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Users"       value={stats.totalUsers}       icon={Users}        color="text-primary" />
          <StatCard label="Organizations"     value={stats.totalOrgs}        icon={Building2}    color="text-secondary" />
          <StatCard label="Courses"           value={stats.totalCourses}     icon={BookOpen}     color="text-purple-500" />
          <StatCard label="Enrollments"       value={stats.totalEnrollments} icon={GraduationCap} color="text-success" />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-ink">Enrollments (last 7 days)</h3>
          </div>
          {stats.enrollmentTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={stats.enrollmentTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#FE2C55" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-muted text-sm">
              No trend data available
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-secondary" />
            <h3 className="text-sm font-semibold text-ink">Courses by Category</h3>
          </div>
          {stats.coursesByCategory?.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.coursesByCategory}>
                <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#25F4EE" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-muted text-sm">
              No category data available
            </div>
          )}
        </Card>
      </div>

      {/* Pending approvals */}
      <Card padding={false}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-warning" />
            <h3 className="text-sm font-semibold text-ink">Pending Course Approvals</h3>
          </div>
          {pending.length > 0 && (
            <Badge color="bg-warning/15 text-yellow-700">{pending.length}</Badge>
          )}
        </div>
        {pending.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">No pending courses — all clear!</p>
        ) : (
          <div className="divide-y divide-border">
            {pending.map((course) => (
              <div key={course.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{course.title}</p>
                  <p className="text-xs text-muted">{course.organization?.name} · {course.category}</p>
                </div>
                <Badge color={COURSE_STATUS.pending.color}>{COURSE_STATUS.pending.label}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Card, StatCard } from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Users, BookOpen, GraduationCap, TrendingUp } from 'lucide-react';

const COLORS = ['#FE2C55', '#25F4EE', '#6C63FF', '#F59E0B', '#10B981', '#EC4899'];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['org-stats', orgId],
    queryFn: () => api.orgStats(orgId || undefined).then((r) => r.data.data),
  });

  const stats = data ?? {};

  return (
    <div className="flex flex-col gap-6">
      {user?.role === 'super_admin' && (
        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium text-ink whitespace-nowrap">Filter by Org ID:</label>
          <input
            className="input max-w-xs"
            placeholder="Leave blank for platform-wide"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Users"     value={stats.totalUsers}       icon={Users}         color="text-primary" />
            <StatCard label="Total Courses"   value={stats.totalCourses}     icon={BookOpen}      color="text-secondary" />
            <StatCard label="Enrollments"     value={stats.totalEnrollments} icon={GraduationCap} color="text-purple-500" />
            <StatCard label="Completions"     value={stats.totalCompletions} icon={TrendingUp}    color="text-success" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Courses by category bar chart */}
            <Card>
              <h3 className="text-sm font-semibold text-ink mb-4">Courses by Category</h3>
              {stats.coursesByCategory?.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.coursesByCategory}>
                    <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#6B7280' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#FE2C55" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted text-sm">No data</div>
              )}
            </Card>

            {/* Enrollments by course pie */}
            <Card>
              <h3 className="text-sm font-semibold text-ink mb-4">Top Enrolled Courses</h3>
              {stats.topCourses?.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={stats.topCourses} dataKey="enrollments" nameKey="title" cx="50%" cy="50%" outerRadius={70}>
                      {stats.topCourses.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted text-sm">No data</div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

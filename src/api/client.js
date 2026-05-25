import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token from localStorage on every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear tokens and redirect to login
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export const api = {
  // Auth
  login:   (data)   => client.post('/auth/login', data),
  logout:  ()       => client.post('/auth/logout', { refreshToken: localStorage.getItem('refreshToken') }),

  // Admin stats
  stats:      ()         => client.get('/admin/stats'),
  orgStats:   (orgId)    => client.get('/admin/org-stats', { params: { org_id: orgId } }),

  // Users
  listUsers:       (params) => client.get('/users', { params }),
  createManaged:   (data)   => client.post('/users/managed', data),
  setActiveStatus: (id, is_active) => client.patch(`/users/${id}/active`, { is_active }),
  deleteUser:      (id)     => client.delete(`/users/${id}`),

  // Organizations
  listOrgs:  (params) => client.get('/organizations', { params }),
  createOrg: (data)   => client.post('/organizations', data),
  deleteOrg: (id)     => client.delete(`/organizations/${id}`),

  // Courses
  listMyCourses:    (params) => client.get('/courses/mine', { params }),
  listPending:      (params) => client.get('/admin/courses/pending', { params }),
  reviewCourse:     (id, data) => client.patch(`/admin/courses/${id}/review`, data),

  // Profile (current user)
  getMe:           ()       => client.get('/users/me'),
  updateMe:        (data)   => client.patch('/users/me', data),
  changePassword:  ({ current_password, new_password }) =>
    client.patch('/users/me/password', { currentPassword: current_password, newPassword: new_password }),
  uploadAvatar:    (file)   => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('resource_type', 'avatar')
    return client.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },

  // Audit logs
  listAuditLogs:    (params) => client.get('/admin/audit-logs', { params }),

  // Announcements
  listAnnouncements:   (params) => client.get('/admin/announcements', { params }),
  createAnnouncement:  (data)   => client.post('/admin/announcements', data),
  deleteAnnouncement:  (id)     => client.delete(`/admin/announcements/${id}`),

  // Courses (general listing with optional filters)
  listCourses: (params) => client.get('/courses', { params }),

  // Categories (super_admin CRUD; GET is public)
  listCategories:   ()         => client.get('/categories'),
  createCategory:   (data)     => client.post('/categories', data),
  updateCategory:   (id, data) => client.patch(`/categories/${id}`, data),
  deleteCategory:   (id)       => client.delete(`/categories/${id}`),
};

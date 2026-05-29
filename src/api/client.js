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
  stats:           ()       => client.get('/admin/stats'),
  orgDashboard:    ()       => client.get('/admin/org-dashboard'),
  instructorDashboard: ()   => client.get('/courses/dashboard'),
  orgStats:        (orgId)  => client.get('/admin/org-stats', { params: { org_id: orgId } }),

  // Users
  listUsers:          (params)       => client.get('/users', { params }),
  createManaged:      (data)         => client.post('/users/managed', data),
  updateUser:         (id, data)     => client.patch(`/users/${id}`, data),
  adminResetPassword: (id)           => client.post(`/users/${id}/reset-password`),
  reassignOrg:        (id, org_id)   => client.patch(`/users/${id}/reassign-org`, { org_id }),
  setActiveStatus:    (id, is_active) => client.patch(`/users/${id}/active`, { is_active }),
  deleteUser:         (id)           => client.delete(`/users/${id}`),

  // Organizations
  listOrgs:           (params)          => client.get('/organizations', { params }),
  getOrg:             (id)              => client.get(`/organizations/${id}`),
  createOrg:          (data)            => client.post('/organizations', data),
  updateOrg:          (id, data)        => client.patch(`/organizations/${id}`, data),
  setOrgActiveStatus: (id, data)        => client.patch(`/organizations/${id}/active`, data),
  deleteOrg:          (id)              => client.delete(`/organizations/${id}`),
  listOrgMembers:     (id)              => client.get(`/organizations/${id}/members`),
  listOrgCourses:     (id, params)      => client.get(`/organizations/${id}/courses`, { params }),
  getOrgEngagement:   (id)              => client.get(`/organizations/${id}/engagement`),
  listApplications:   (params)          => client.get('/organizations/applications', { params }),
  reviewApplication:  (appId, data)     => client.patch(`/organizations/applications/${appId}/review`, data),

  // Courses
  listMyCourses:  (params)     => client.get('/courses/mine', { params }),
  getCourse:      (id)         => client.get(`/courses/${id}`),
  createCourse:   (data)       => client.post('/courses', data),
  updateCourse:   (id, data)   => client.patch(`/courses/${id}`, data),
  deleteCourse:   (id)         => client.delete(`/courses/${id}`),
  submitCourse:   (id)         => client.post(`/courses/${id}/submit`),
  approveCourse:  (id, data)   => client.patch(`/courses/${id}/approve`, data),
  listStudents:   (id, params) => client.get(`/courses/${id}/students`, { params }),

  // Lessons
  getLesson:      (id)         => client.get(`/lessons/${id}`),
  createLesson:   (data)       => client.post('/lessons', data),
  updateLesson:   (id, data)   => client.patch(`/lessons/${id}`, data),
  deleteLesson:   (id)         => client.delete(`/lessons/${id}`),
  reorderLessons: (data)       => client.patch('/lessons/reorder', data),

  // Quizzes
  getQuizByLesson: (lessonId)  => client.get(`/quizzes/lesson/${lessonId}`),
  createQuiz:      (data)      => client.post('/quizzes', data),
  updateQuiz:      (id, data)  => client.patch(`/quizzes/${id}`, data),
  deleteQuiz:      (id)        => client.delete(`/quizzes/${id}`),

  // Profile (current user)
  getMe:           ()       => client.get('/users/me'),
  updateMe:        (data)   => client.patch('/users/me', data),
  changePassword:  ({ current_password, new_password }) =>
    client.patch('/users/me/password', { currentPassword: current_password, newPassword: new_password }),
  uploadAvatar: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('resource_type', 'avatar')
    return client.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  uploadOrgLogo: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('resource_type', 'org_logo')
    return client.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },

  // Audit logs
  listAuditLogs:    (params) => client.get('/admin/audit-logs', { params }),

  // Announcements
  listAnnouncements:   (params) => client.get('/admin/announcements', { params: { limit: 10, ...params } }),
  createAnnouncement:  (data)   => client.post('/admin/announcements', data),
  deleteAnnouncement:  (id)     => client.delete(`/admin/announcements/${id}`),

  // Courses (general listing with optional filters)
  listCourses: (params) => client.get('/courses', { params }),

  // Categories (super_admin CRUD; GET is public)
  listCategories:        ()             => client.get('/categories'),
  listCategoryCourses:   (id, params)   => client.get(`/categories/${id}/courses`, { params }),
  createCategory:        (data)         => client.post('/categories', data),
  updateCategory:        (id, data)     => client.patch(`/categories/${id}`, data),
  deleteCategory:        (id)           => client.delete(`/categories/${id}`),

  // Course thumbnail upload
  uploadCourseThumbnail: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('resource_type', 'course_thumbnail')
    return client.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },

  // Lesson image upload (single file → Cloudinary)
  uploadLessonImage: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('resource_type', 'lesson_image')
    return client.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },

  // Lesson video upload (single file → Cloudinary)
  uploadLessonVideo: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('resource_type', 'lesson_video')
    return client.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
};

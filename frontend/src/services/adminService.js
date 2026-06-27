import API from './api';

// Applications
export const getAllApplications = (params) =>
  API.get('/admin/applications', { params });

export const getApplicationById = (id) => API.get(`/admin/applications/${id}`);

export const updateApplicationStatus = (id, data) =>
  API.patch(`/admin/applications/${id}/status`, data);

export const downloadLetterAdmin = (id) =>
  API.get(`/admin/applications/${id}/letter`, { responseType: 'blob' });

// Users
export const getAllUsers = (params) => API.get('/admin/users', { params });
export const toggleUserStatus = (id, isActive) =>
  API.patch(`/admin/users/${id}`, { isActive });

// Dashboard stats
export const getStats = () => API.get('/admin/stats');

// Reports
export const getReports = () => API.get('/admin/reports');
export const downloadReportCSV = () =>
  API.get('/admin/reports', { params: { format: 'csv' }, responseType: 'blob' });

// Audit Logs
export const getAuditLogs = () => API.get('/admin/logs');

// Student Profiles Management
export const getAllProfiles = (params) => API.get('/admin/profiles', { params });
export const getProfileById = (id) => API.get(`/admin/profiles/${id}`);
export const verifyProfile = (id, data) => API.patch(`/admin/profiles/${id}/verify`, data);
export const deleteProfileAdmin = (id) => API.delete(`/admin/profiles/${id}`);

export const updateDocumentStatus = (applicationId, docField, data) =>
  API.patch(`/admin/applications/${applicationId}/documents/${docField}`, data);

export const getAnalyticsDashboard = (params) =>
  API.get('/admin/analytics/dashboard', { params });

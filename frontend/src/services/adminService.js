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

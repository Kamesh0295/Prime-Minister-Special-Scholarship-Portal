import API from './api';

export const getProfile = () => API.get('/student/profile');
export const updateProfile = (data) => API.put('/student/profile', data);
export const getApplication = () => API.get('/student/application');
export const createApplication = (data) => API.post('/student/application', data);
export const updateApplication = (id, data) => API.put(`/student/application/${id}`, data);
export const getApplicationStatus = () => API.get('/student/application/status');
export const downloadApprovalLetter = () =>
  API.get('/student/application/letter', { responseType: 'blob' });

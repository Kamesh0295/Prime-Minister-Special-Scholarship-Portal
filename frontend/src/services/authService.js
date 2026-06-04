import API from './api';

export const registerStudent = (data) => API.post('/auth/register', data);
export const loginUser = (data) => API.post('/auth/login', data);
export const logoutUser = () => API.post('/auth/logout');
export const refreshToken = (refreshToken) =>
  API.post('/auth/refresh-token', { refreshToken });

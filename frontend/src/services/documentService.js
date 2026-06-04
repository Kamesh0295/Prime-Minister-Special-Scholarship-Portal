import API from './api';

export const uploadDocuments = (formData) =>
  API.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getDocuments = (applicationId) =>
  API.get(`/documents/${applicationId}`);

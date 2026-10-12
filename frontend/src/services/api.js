import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const apiClient = axios.create({
  baseURL,
  timeout: 15000,
});

export const api = {
  // Health
  getHealth: () => apiClient.get('/api/health').then((r) => r.data),

  // Overview
  getOverview: () => apiClient.get('/api/overview').then((r) => r.data),

  // Water
  getWaterReadings: (building = '') =>
    apiClient.get('/api/water', { params: building ? { building } : {} }).then((r) => r.data),

  // Electricity
  getElectricityReadings: (building = '') =>
    apiClient.get('/api/electricity', { params: building ? { building } : {} }).then((r) => r.data),

  // Garbage
  getGarbageBins: () => apiClient.get('/api/garbage').then((r) => r.data),

  // Alerts
  getAlerts: (filters = {}) =>
    apiClient.get('/api/alerts', { params: filters }).then((r) => r.data),
  resolveAlert: (alertId, notes = '') =>
    apiClient.post(`/api/alerts/${alertId}/resolve`, { status: 'Resolved', notes }).then((r) => r.data),
  reopenAlert: (alertId) =>
    apiClient.post(`/api/alerts/${alertId}/reopen`).then((r) => r.data),

  // Device Issues
  getDeviceIssues: (filters = {}) =>
    apiClient.get('/api/devices/issues', { params: filters }).then((r) => r.data),
  getDeviceIssueById: (issueId) =>
    apiClient.get(`/api/devices/issues/${issueId}`).then((r) => r.data),
  createDeviceIssue: (issueData) =>
    apiClient.post('/api/devices/issues', issueData).then((r) => r.data),
  updateDeviceIssue: (issueId, updateData) =>
    apiClient.patch(`/api/devices/issues/${issueId}`, updateData).then((r) => r.data),
  getDeviceSummary: () =>
    apiClient.get('/api/devices/summary').then((r) => r.data),

  // Document Upload & Extraction
  extractDocument: (formData) =>
    apiClient.post('/api/upload/extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  confirmDocument: (payload) =>
    apiClient.post('/api/upload/confirm', payload, {
      headers: { 'Content-Type': 'application/json' },
    }).then((r) => r.data),

  getDocuments: (filters = {}) =>
    apiClient.get('/api/documents', { params: filters }).then((r) => r.data),

  getDocumentDetail: (docId) =>
    apiClient.get(`/api/documents/${docId}`).then((r) => r.data),

  deleteDocument: (docId) =>
    apiClient.delete(`/api/documents/${docId}`).then((r) => r.data),

  getExportUrl: () => `${baseURL}/api/documents/export`,

  // Resource Analytics
  getElectricityAnalytics: (building = '') =>
    apiClient.get('/api/analytics/electricity', { params: building ? { building } : {} }).then((r) => r.data),

  getWaterAnalytics: (building = '') =>
    apiClient.get('/api/analytics/water', { params: building ? { building } : {} }).then((r) => r.data),
};

export default api;

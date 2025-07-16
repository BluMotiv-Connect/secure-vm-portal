import apiClient from './apiClient';

export const getVMs = async (params) => {
  const response = await apiClient.get('/vms', { params });
  return response.data;
};

export const getVMById = async (id) => {
  const response = await apiClient.get(`/vms/${id}`);
  return response.data;
};

export const createVM = async (vmData) => {
  const response = await apiClient.post('/vms', vmData);
  return response.data;
};

export const updateVM = async ({ id, ...vmData }) => {
  const response = await apiClient.put(`/vms/${id}`, vmData);
  return response.data;
};

export const deleteVM = async (id) => {
  const response = await apiClient.delete(`/vms/${id}`);
  return response.data;
};

export const assignVM = async ({ vmId, userId }) => {
  const response = await apiClient.post(`/vms/${vmId}/assign`, { userId });
  return response.data;
};

export const unassignVM = async (vmId) => {
  const response = await apiClient.post(`/vms/${vmId}/unassign`);
  return response.data;
};

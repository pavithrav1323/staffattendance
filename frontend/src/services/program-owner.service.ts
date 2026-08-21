import { apiRequest } from './api';

export interface MasterAdmin {
  id: string;
  employeeId: string | null;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  companyCode: string | null;
  companyName: string | null;
  createdAt: string;
}

export interface CreateMasterAdminInput {
  employeeId: string;
  name: string;
  email: string;
  phone: string | null;
  password: string;
  companyCode: string;
  companyName: string;
}

export const programOwnerService = {
  async getMasterAdmins(): Promise<{ success: boolean; data: MasterAdmin[] }> {
    const response = await apiRequest<MasterAdmin[]>('/program-owner/master-admins');
    if (response.success && response.data) {
      return { success: true, data: response.data };
    }
    throw new Error(response.message);
  },

  async createMasterAdmin(input: CreateMasterAdminInput): Promise<{ success: boolean; data: MasterAdmin }> {
    const response = await apiRequest<MasterAdmin>('/program-owner/master-admins', 'POST', input);
    if (response.success && response.data) {
      return { success: true, data: response.data };
    }
    throw new Error(response.message);
  },

  async activateMasterAdmin(id: string): Promise<{ success: boolean }> {
    const response = await apiRequest(`/program-owner/master-admins/${id}/activate`, 'PATCH');
    if (response.success) {
      return { success: true };
    }
    throw new Error(response.message);
  },

  async deactivateMasterAdmin(id: string): Promise<{ success: boolean }> {
    const response = await apiRequest(`/program-owner/master-admins/${id}/deactivate`, 'PATCH');
    if (response.success) {
      return { success: true };
    }
    throw new Error(response.message);
  },

  async deleteMasterAdmin(id: string): Promise<{ success: boolean }> {
    const response = await apiRequest(`/program-owner/master-admins/${id}`, 'DELETE');
    if (response.success) {
      return { success: true };
    }
    throw new Error(response.message);
  },
};
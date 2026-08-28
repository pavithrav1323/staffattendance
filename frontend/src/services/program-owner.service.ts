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

export interface Company {
  id: string;
  companyCode: string;
  companyName: string;
  email: string | null;
  phone: string | null;
  timezone?: string;
  isActive: boolean;
  status: string;
  createdAt: string;
  masterAdminCount: number;
  staffCount: number;
  adminName: string | null;
  adminEmail: string | null;
}

export interface CompanyMasterAdmin {
  id: string;
  employeeId: string | null;
  name: string;
  email: string;
  status: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface CompanyDetails {
  company: Company;
  status: string;
  admin: CompanyMasterAdmin | null;
  masterAdmins: CompanyMasterAdmin[];
  staffCount: number;
  departments: Department[];
}

export const programOwnerService = {
  async getMasterAdmins(): Promise<{ success: boolean; data: MasterAdmin[] }> {
    const response = await apiRequest<MasterAdmin[]>('/program-owner/master-admins');
    if (response.success && response.data) {
      return { success: true, data: response.data };
    }
    throw new Error(response.message);
  },

  async getCompanies(): Promise<{ success: boolean; data: Company[] }> {
    const response = await apiRequest<Company[]>('/program-owner/companies');
    if (response.success && response.data) {
      return { success: true, data: response.data };
    }
    throw new Error(response.message);
  },

  async getCompanyDetails(companyId: string): Promise<{ success: boolean; data: CompanyDetails }> {
    const response = await apiRequest<CompanyDetails>(`/program-owner/companies/${companyId}`);
    if (response.success && response.data) {
      return { success: true, data: response.data };
    }
    throw new Error(response.message);
  },

  async deleteCompany(companyId: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiRequest<{ message?: string }>(`/program-owner/companies/${companyId}`, 'DELETE');
    if (response.success) {
      return { success: true, message: response.message || response.data?.message };
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
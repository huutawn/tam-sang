import apiClient from "./api-client";
import { UserPayload } from "@/lib/auth-utils";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: UserPayload;
  message?: string;
}

export const AuthService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  refresh: async (): Promise<void> => {
    await apiClient.post('/auth/refresh');
  },
  
  // register: async (data: RegisterData) => { ... }
};

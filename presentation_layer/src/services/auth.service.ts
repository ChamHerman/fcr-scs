import api from './api';

export interface LoginResponse {
  message: string;
  token: string;
  user: {
    userId: string;
    name: string;
    email: string;
    role: string;
    identificationNumber?: string;
    contactNumber?: string;
  };
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/users/login', { email, password });
    return response.data;
  },
  
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/users/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/users/reset-password', { token, newPassword });
    return response.data;
  },

  register: async (data: any): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/users/register', data);
    return response.data;
  },

  activateAccount: async (token: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/users/activate', { token });
    return response.data;
  }
};

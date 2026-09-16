import api from './api';

export interface LoginResponse {
  message: string;
  token?: string;
  user?: {
    userId: string;
    name: string;
    email: string;
    role: string;
    identificationNumber?: string;
    contactNumber?: string;
  };
  requiresOtp?: boolean;
  tempToken?: string;
  email?: string;
}

export interface VerifyOtpResponse {
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

export interface ResendOtpResponse {
  message: string;
  resendCooldownSeconds?: number;
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/users/login', { email, password });
    return response.data;
  },

  verifyOtp: async (tempToken: string, otp: string): Promise<VerifyOtpResponse> => {
    const response = await api.post<VerifyOtpResponse>('/users/verify-otp', { tempToken, otp });
    return response.data;
  },

  resendOtp: async (tempToken: string): Promise<ResendOtpResponse> => {
    const response = await api.post<ResendOtpResponse>('/users/resend-otp', { tempToken });
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
  },

  getUserById: async (userId: string): Promise<{ success: boolean; data?: any }> => {
    const response = await api.get<{ success: boolean; data?: any }>(`/users/${userId}`);
    return response.data;
  }
};


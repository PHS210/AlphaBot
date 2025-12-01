import { apiFetch } from '@/api/client';

export interface SignupPayload {
  login_id: string;
  username: string;
  password: string;
}

export interface SignupResponse {
  user_id: number;
  login_id: string;
  username: string;
}

export const signup = async (payload: SignupPayload): Promise<SignupResponse> => {
  return apiFetch<SignupResponse>('/api/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export interface LoginPayload {
  login_id: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export const login = async (payload: LoginPayload): Promise<LoginResponse> => {
  const formData = new URLSearchParams();
  formData.append('username', payload.login_id);
  formData.append('password', payload.password);

  return apiFetch<LoginResponse>('/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
    auth: false,
  });
};


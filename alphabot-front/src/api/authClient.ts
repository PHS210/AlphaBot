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


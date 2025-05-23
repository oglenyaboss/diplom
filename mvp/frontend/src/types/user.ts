export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  department: string;
  position: string;
  eth_address: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export enum UserRole {
  ADMIN = "admin",
  MANAGER = "manager",
  WAREHOUSE = "warehouse",
  EMPLOYEE = "employee",
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refresh_token: string;
  expires_in: number;
  id: string;
  username: string;
  role: string;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  department?: string;
  position?: string;
}

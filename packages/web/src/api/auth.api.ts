import { apiRequest } from "./client.js";
import type { User } from "../types/index.js";

export interface AuthResult {
  token: string;
  user: User;
}

export function login(email: string, password: string): Promise<AuthResult> {
  return apiRequest("/auth/login", { method: "POST", body: { email, password } });
}

export function register(name: string, email: string, password: string): Promise<AuthResult> {
  return apiRequest("/auth/register", { method: "POST", body: { name, email, password } });
}

export function me(): Promise<{ user: User }> {
  return apiRequest("/auth/me");
}

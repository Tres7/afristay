import { getApiBaseUrl } from "@/lib/api-url";
import { LoginResponse } from "@/types/api/auth";

export async function authenticateWithCredentials(
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch(`${getApiBaseUrl()}/v1/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.detail ?? "Identifiants invalides.") as Error & {
      code?: string;
    };
    error.code = data.code;
    throw error;
  }

  return data;
}
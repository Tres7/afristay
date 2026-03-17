import { getApiBaseUrl } from "@/lib/api-url";
import { GoogleAuthResponse } from "@/types/api/auth";


export async function authenticateWithGoogle(idToken: string): Promise<GoogleAuthResponse> {
  const res = await fetch(`${getApiBaseUrl()}/v1/auth/google/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail ?? "Connexion Google impossible.");
  }

  return data;
}
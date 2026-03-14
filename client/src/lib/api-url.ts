export function getApiBaseUrl() {
  const internalApiUrl = process.env.INTERNAL_API_URL;
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (typeof window === "undefined") {
    return internalApiUrl || publicApiUrl || "http://localhost:8000/api";
  }

  return publicApiUrl || "http://localhost:8000/api";
}
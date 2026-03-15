import Credentials from "next-auth/providers/credentials";

export const backendSessionProvider = Credentials({
  id: "backend-session",
  name: "Backend Session",
  credentials: {
    id: { label: "Id", type: "text" },
    name: { label: "Name", type: "text" },
    email: { label: "Email", type: "email" },
    image: { label: "Image", type: "text" },
    role: { label: "Role", type: "text" },
    accessToken: { label: "Access Token", type: "text" },
    refreshToken: { label: "Refresh Token", type: "text" },
  },
  async authorize(credentials) {
    if (
      !credentials?.id ||
      !credentials?.email ||
      !credentials?.accessToken ||
      !credentials?.refreshToken
    ) {
      return null;
    }

    return {
      id: String(credentials.id),
      name: String(credentials.name ?? ""),
      email: String(credentials.email),
      image: credentials.image ? String(credentials.image) : null,
      accessToken: String(credentials.accessToken),
      refreshToken: String(credentials.refreshToken),
      role: String(credentials.role ?? "voyageur"),
    };
  },
});

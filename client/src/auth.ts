import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Mode démo : accepte n'importe quel email/password non vide
        // TODO: Remplacer par un appel à l'API Django
        if (credentials?.email && credentials?.password) {
          return {
            id: "1",
            name: "John Doe",
            email: String(credentials.email),
            image: null,
          };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  session: {
    strategy: "jwt",
  },
});

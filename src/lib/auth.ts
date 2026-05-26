import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { masterPrisma } from "@/lib/prisma-master";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Usuário", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await masterPrisma.user.findUnique({
          where: { username: credentials.username as string },
          include: { tenant: true },
        });

        if (!user || !user.active || !user.tenant?.active) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email ?? `${user.username}@carflow.local`,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenantSlug: user.tenant.slug,
          tenantName: user.tenant.name,
          databaseUrl: user.tenant.databaseUrl,
          evolutionApiUrl: user.tenant.evolutionApiUrl,
          evolutionApiKey: user.tenant.evolutionApiKey,
          evolutionInstance: user.tenant.evolutionInstance,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as any;
        token.id = u.id;
        token.role = u.role;
        token.tenantId = u.tenantId;
        token.tenantSlug = u.tenantSlug;
        token.tenantName = u.tenantName;
        token.databaseUrl = u.databaseUrl;
        token.evolutionApiUrl = u.evolutionApiUrl;
        token.evolutionApiKey = u.evolutionApiKey;
        token.evolutionInstance = u.evolutionInstance;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        const s = session.user as any;
        s.id = token.id;
        s.role = token.role;
        s.tenantId = token.tenantId;
        s.tenantSlug = token.tenantSlug;
        s.tenantName = token.tenantName;
        s.databaseUrl = token.databaseUrl;
        s.evolutionApiUrl = token.evolutionApiUrl;
        s.evolutionApiKey = token.evolutionApiKey;
        s.evolutionInstance = token.evolutionInstance;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  trustHost: true,
});

import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { role: { include: { permissions: true } } },
        });

        if (
          !user ||
          !user.password ||
          !bcrypt.compareSync(credentials.password, user.password)
        ) {
          return null;
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name ?? "",
          image: user.image || null, // Include image in the user object
          role: user.role.name,
          permissions: user.role.permissions.map((p) => p.name),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Handle session updates (when update() is called)
      if (trigger === "update" && session) {
        // Update the token with new session data
        if (session.name) token.name = session.name;
        if (session.image) token.image = session.image;

        // If updating image, also fetch latest user data from database
        if (session.image && token.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { image: true, name: true },
          });
          if (dbUser) {
            token.image = dbUser.image;
            token.name = dbUser.name;
          }
        }
      }

      // Initial login
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.permissions = user.permissions;
        token.image = user.image;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.permissions = token.permissions as string[];
        session.user.image = token.image as string | null;
        session.user.name = token.name as string;
      }

      // Always fetch the latest user data from database to ensure image is up-to-date
      if (session.user?.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: { include: { permissions: true } },
            },
          });

          if (dbUser) {
            session.user = {
              ...session.user,
              id: dbUser.id.toString(),
              name: dbUser.name || "",
              image: dbUser.image,
              role: dbUser.role.name,
              permissions: dbUser.role.permissions.map((p) => p.name),
            };
          }
        } catch (error) {
          console.error("Error fetching user data in session callback:", error);
        }
      }

      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

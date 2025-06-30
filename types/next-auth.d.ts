// types/next-auth.d.ts
import NextAuth from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      role: string; // ✅ Obligatoire
      permissions: string[]; // ✅ Si utilisé
    };
    accessToken?: string;
  }

  interface User {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    role: string;
    permissions: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    role: string;
    permissions: string[];
    accessToken?: string;
  }
}

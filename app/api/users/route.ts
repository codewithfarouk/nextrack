import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { authOptions } from "../auth/[...nextauth]/route";
import { sendResetEmail } from "@/lib/mail"; // à créer si pas fait
import crypto from "crypto";

const prisma = new PrismaClient();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only SUPERADMIN, IM, and SDM can fetch user data
  const allowedRoles = ["SUPERADMIN", "IM", "SDM", "DIRECTEUR","BUMTLS"];
  if (!session.user.role || !allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      include: { role: true },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, name, roleId } = await request.json();

  if (!email || !name || !roleId) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Vérifie si l'utilisateur existe déjà
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return NextResponse.json(
      { error: "Un utilisateur avec cet email existe déjà." },
      { status: 400 }
    );
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const expiryDate = new Date(Date.now() + 60 * 60 * 1000); // expire dans 1 heure

  try {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        roleId,
        resetToken,
        resetTokenExpiry: expiryDate,
      },
      include: { role: true },
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || // recommandé pour Vercel ou autres
      (process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : ""); // ← remplace si nécessaire

    await sendResetEmail(email, resetToken, baseUrl);

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "User creation failed" },
      { status: 500 }
    );
  }
}
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, email, name, roleId, password } = await request.json();
  if (!id || !email || !name || !roleId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const data: any = { email, name, roleId };
  if (password) {
    data.password = bcrypt.hashSync(password, 10);
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      include: { role: true },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "User update failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: "User deleted" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "User deletion failed" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendResetEmail } from "@/lib/mail";
import crypto from "crypto";

export async function POST(req: Request) {
  const { email, name, roleId } = await req.json();

  if (!email || !roleId) {
    return NextResponse.json({ error: "Champs manquants." }, { status: 400 });
  }

  // Vérification si l'email existe déjà
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { error: "Cet utilisateur existe déjà." },
      { status: 400 }
    );
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const expiryDate = new Date(Date.now() + 1000 * 60 * 60); // 1h

  try {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        roleId,
        resetToken,
        resetTokenExpiry: expiryDate,
      },
    });

    const baseUrl =
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : "https://nextrack.com";

    await sendResetEmail(email, resetToken, baseUrl);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur création user :", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'utilisateur." },
      { status: 500 }
    );
  }
}

// app/api/profile/image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "../../../../lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";
import fs from "fs";
import path from "path";

export const config = {
  runtime: "nodejs", // 👈 necessary for fs module support
};

export async function POST(request: NextRequest) {
  console.log("=== App Router API Hit ===");

  try {
    const session = await getServerSession(authOptions);
    console.log("Session:", session ? "Found" : "Not found");

    if (!session || !session.user) {
      console.log("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      console.log("No file found in form data");
      return NextResponse.json({ error: "No image file uploaded" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public/uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const timestamp = Date.now();
    const extension = path.extname(file.name);
    const filename = `${session.user.id}-${timestamp}${extension}`;
    const filepath = path.join(uploadDir, filename);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer); // ✅ Use Uint8Array here

    fs.writeFileSync(filepath, buffer);

    const filePath = `/uploads/${filename}`;

    await prisma.user.update({
      where: { id: parseInt(session.user.id) },
      data: { image: filePath },
    });

    return NextResponse.json({
      success: true,
      image: filePath,
      message: "Profile image updated successfully",
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: message },
      { status: 500 }
    );
  }
}

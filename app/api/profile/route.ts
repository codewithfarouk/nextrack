import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { prisma } from "../../../lib/prisma";
import fs from "fs";
import path from "path";
import { authOptions } from "../auth/[...nextauth]/route";
import formidable, { Fields, Files } from "formidable";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("=== API Route Hit ===");
  console.log("Method:", req.method);
  console.log("Headers:", req.headers);

  try {
    const session = await getServerSession(req, res, authOptions);
    console.log("Session:", session ? "Found" : "Not found");

    if (!session || !session.user) {
      console.log("Unauthorized access attempt");
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.method === "POST") {
      console.log("Processing POST request");

      // Upload directory
      const uploadDir = path.join(process.cwd(), "public/uploads");

      try {
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
          console.log("Created upload directory");
        }
      } catch (error) {
        console.error("Failed to create upload directory:", error);
        return res.status(500).json({ error: "Failed to create upload directory" });
      }

      const form = new formidable.IncomingForm({
        uploadDir,
        keepExtensions: true,
        maxFileSize: 5 * 1024 * 1024, // 5MB
      });

      console.log("Form configured, parsing request...");

      form.parse(req, async (err: any, fields: Fields, files: Files) => {
        if (err) {
          console.error("Form parsing error:", err);
          return res.status(400).json({ error: "Failed to parse form data: " + (err as Error).message });
        }

        console.log("Form parsed successfully");
        console.log("Fields:", fields);
        console.log("Files:", Object.keys(files));

        const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;

        if (!imageFile || !imageFile.filepath) {
          console.log("No image file found in upload");
          return res.status(400).json({ error: "No image file uploaded" });
        }

        console.log("Image file details:", {
          name: imageFile.originalFilename,
          size: imageFile.size,
          type: imageFile.mimetype,
          path: imageFile.filepath,
        });

        try {
          const fileName = path.basename(imageFile.filepath);
          const filePath = `/uploads/${fileName}`;

          console.log("Updating database with image path:", filePath);

          await prisma.user.update({
            where: { id: parseInt(session.user.id) },
            data: { image: filePath },
          });

          console.log("Database updated successfully");

          return res.status(200).json({
            success: true,
            image: filePath,
            message: "Profile image updated successfully",
          });

        } catch (dbError) {
          const message = dbError instanceof Error ? dbError.message : "Unknown DB error";
          console.error("Database error:", dbError);
          return res.status(500).json({ error: "Database update failed: " + message });
        }
      });

    } else {
      console.log("Method not allowed:", req.method);
      return res.status(405).json({ error: "Method not allowed" });
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    const stack = error instanceof Error ? error.stack : undefined;

    console.error("Top-level error in API handler:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: message,
      stack: process.env.NODE_ENV === "development" ? stack : undefined,
    });
  }
}

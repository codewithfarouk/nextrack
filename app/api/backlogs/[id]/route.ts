import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // ✅ Vérifie ce chemin
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id || !session.user?.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const backlogId = parseInt(params.id, 10);
  if (isNaN(backlogId)) {
    return NextResponse.json({ error: "Invalid backlog ID" }, { status: 400 });
  }

  try {
    const backlog = await prisma.backlog.findUnique({
      where: { id: backlogId },
      select: { creatorId: true },
    });

    if (!backlog) {
      return NextResponse.json({ error: "Backlog not found" }, { status: 404 });
    }

    const allowedRoles = ["SUPERADMIN", "IM", "SDM"];
    const isCreator = backlog.creatorId === parseInt(session.user.id);
    const canDelete =
      session.user.role === "SUPERADMIN" || (isCreator && allowedRoles.includes(session.user.role));

    if (!canDelete) {
      return NextResponse.json(
        { error: "You can only delete backlogs you created, unless you are SUPERADMIN" },
        { status: 403 }
      );
    }

    const activeHistorique = await prisma.historiqueStatus.findFirst({
      where: { backlogId, isActive: true },
    });

    if (activeHistorique) {
      return NextResponse.json(
        { error: "Cannot delete an active historique backlog" },
        { status: 403 }
      );
    }

    await prisma.backlog.delete({ where: { id: backlogId } });

    return NextResponse.json({ message: "Backlog deleted successfully" });
  } catch (error) {
    console.error("Error deleting backlog:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to delete backlog", details: message },
      { status: 500 }
    );
  }
}

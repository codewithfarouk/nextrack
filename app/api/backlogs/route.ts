import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]/route";

const allowedRoles = ["SUPERADMIN", "IM", "SDM"];
const privilegedRoles = ["SUPERADMIN", "IM", "SDM"];

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id || !session.user?.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const moduleType = searchParams.get("moduleType") ?? undefined;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { roleId: true, role: { select: { name: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isPrivilegedUser = privilegedRoles.includes(session.user.role);
    let backlogs = [];
    let historiqueBacklog = null;

    // Always fetch active historique if user has access
    const activeHistorique = await prisma.historiqueStatus.findFirst({
      where: { isActive: true },
      include: {
        backlog: {
          include: {
            roles: { select: { id: true, name: true } },
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
                role: { select: { name: true } },
              },
            },
          },
        },
        activatedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (
      activeHistorique &&
      activeHistorique.backlog?.roles.some((role) => role.id === user.roleId)
    ) {
      historiqueBacklog = {
        id: activeHistorique.backlog.id.toString(),
        title: activeHistorique.backlog.title,
        content: activeHistorique.backlog.content,
        createdAt: activeHistorique.backlog.createdAt,
        roles: activeHistorique.backlog.roles,
        creator: activeHistorique.backlog.creator,
        isHistorique: true,
        activatedAt: activeHistorique.activatedAt,
        activatedBy: activeHistorique.activatedBy,
      };
    }

    if (isPrivilegedUser) {
      // Privileged users: get all backlogs they have access to
      backlogs = await prisma.backlog.findMany({
        where: {
          moduleType,
          roles: { some: { id: user.roleId } },
        },
        include: {
          roles: { select: { id: true, name: true } },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              role: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Non-privileged users: get only recent backlogs with restrictions
      const allBacklogs = await prisma.backlog.findMany({
        where: {
          moduleType,
          roles: { some: { id: user.roleId } },
        },
        include: {
          roles: { select: { id: true, name: true } },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              role: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Filter backlogs for non-privileged users
      const userOwnBacklogs = allBacklogs.filter(
        (backlog) => backlog.creatorId === parseInt(session.user.id)
      );

      // Get the most recent backlog created by IM/SDM users (excluding the active historique)
      const recentFromPrivileged = allBacklogs
        .filter((backlog) => 
          privilegedRoles.includes(backlog.creator?.role?.name || "") &&
          backlog.id !== activeHistorique?.backlogId
        )
        .slice(0, 1); // Only the most recent one

      // Combine: user's own backlogs + most recent from privileged users
      const combinedBacklogs = [
        ...userOwnBacklogs,
        ...recentFromPrivileged.filter(
          (privilegedBacklog) => 
            !userOwnBacklogs.some((userBacklog) => userBacklog.id === privilegedBacklog.id)
        )
      ];

      backlogs = combinedBacklogs.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    const mappedBacklogs = backlogs.map((b) => ({
      id: b.id.toString(),
      title: b.title,
      content: b.content,
      createdAt: b.createdAt,
      roles: b.roles,
      creator: b.creator,
      isHistorique: false,
    }));

    const finalBacklogs = historiqueBacklog
      ? [historiqueBacklog, ...mappedBacklogs]
      : mappedBacklogs;

    return NextResponse.json(finalBacklogs);
  } catch (error: unknown) {
    console.error("Error fetching backlogs:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch backlogs", details: message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !allowedRoles.includes(session.user?.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, content, moduleType, roleIds } = await request.json();

    if (!title || !moduleType || !Array.isArray(roleIds)) {
      return NextResponse.json(
        { error: "Missing or invalid fields" },
        { status: 400 }
      );
    }

    const existingRoles = await prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true },
    });

    if (existingRoles.length !== roleIds.length) {
      return NextResponse.json(
        { error: "Some roles not found" },
        { status: 400 }
      );
    }

    const backlog = await prisma.backlog.create({
      data: {
        title,
        content,
        moduleType,
        creatorId: parseInt(session.user.id),
        roles: { connect: roleIds.map((id: number) => ({ id })) },
      },
      include: {
        roles: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      id: backlog.id.toString(),
      title: backlog.title,
      content: backlog.content,
      createdAt: backlog.createdAt,
      roles: backlog.roles,
      creator: backlog.creator,
      isHistorique: false,
    });
  } catch (error: unknown) {
    console.error("Error creating backlog:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create backlog", details: message },
      { status: 500 }
    );
  }
}

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
      return NextResponse.json(
        { error: "Backlog not found" },
        { status: 404 }
      );
    }

    const isCreator = backlog.creatorId === parseInt(session.user.id);
    const canDelete =
      session.user.role === "SUPERADMIN" ||
      (allowedRoles.includes(session.user.role) && isCreator);

    if (!canDelete) {
      return NextResponse.json(
        {
          error:
            "You can only delete backlogs you created, unless you are SUPERADMIN",
        },
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
  } catch (error: unknown) {
    console.error("Error deleting backlog:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to delete backlog", details: message },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]/route";

async function checkViewPermissions(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: "Unauthorized", status: 401 };
  }
  return { session, userRole: session.user?.role };
}

async function checkManagePermissions(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: "Unauthorized", status: 401 };
  }
  const userRole = session.user?.role;
  if (userRole !== "IM" && userRole !== "SDM") {
    return {
      error: "Insufficient permissions. Only IM and SDM can manage historique.",
      status: 403,
    };
  }
  return { session, userRole };
}

export async function GET(req: NextRequest) {
  try {
    const permissionCheck = await checkViewPermissions(req);
    if ("error" in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    const activeHistorique = await prisma.historiqueStatus.findFirst({
      where: { isActive: true },
      include: {
        backlog: {
          include: {
            creator: { select: { id: true, name: true, email: true } },
            roles: { select: { id: true, name: true } },
          },
        },
        activatedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      activeHistorique: activeHistorique
        ? {
            backlogId: activeHistorique.backlogId.toString(),
            backlog: {
              id: activeHistorique.backlog.id.toString(),
              title: activeHistorique.backlog.title,
              content: activeHistorique.backlog.content,
              createdAt: activeHistorique.backlog.createdAt,
              roles: activeHistorique.backlog.roles,
              creator: activeHistorique.backlog.creator,
            },
            activatedAt: activeHistorique.activatedAt,
            activatedBy: activeHistorique.activatedBy,
          }
        : null,
    });
  } catch (error) {
    console.error("GET Historique API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const permissionCheck = await checkManagePermissions(req);
    if ("error" in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    const { session } = permissionCheck;
    const { backlogId } = await req.json();
    const { role, id: userId } = session.user || {};

    if (!backlogId) {
      return NextResponse.json(
        { error: "Backlog ID is required" },
        { status: 400 }
      );
    }

    const backlogIdInt = parseInt(backlogId, 10);
    if (isNaN(backlogIdInt)) {
      return NextResponse.json(
        { error: "Invalid backlog ID format" },
        { status: 400 }
      );
    }

    if (!role) {
      return NextResponse.json(
        { error: "User role is missing" },
        { status: 400 }
      );
    }

    const backlog = await prisma.backlog.findFirst({
      where: {
        id: backlogIdInt,
        roles: { some: { name: role } },
      },
    });

    if (!backlog) {
      return NextResponse.json(
        { error: "Backlog not found or access denied" },
        { status: 404 }
      );
    }

    await prisma.historiqueStatus.updateMany({
      where: { isActive: true },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedById: parseInt(session?.user?.id as string, 10),
      },
    });

    const newHistorique = await prisma.historiqueStatus.create({
      data: {
        backlogId: backlogIdInt,
        activatedById: parseInt(session?.user?.id as string, 10),
        activatedAt: new Date(),
        isActive: true,
      },
      include: {
        backlog: {
          include: {
            creator: { select: { id: true, name: true, email: true } },
            roles: { select: { id: true, name: true } },
          },
        },
        activatedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      message: "Historique activated successfully",
      activeHistorique: {
        backlogId: newHistorique.backlogId.toString(),
        backlog: {
          id: newHistorique.backlog.id.toString(),
          title: newHistorique.backlog.title,
          content: newHistorique.backlog.content,
          createdAt: newHistorique.backlog.createdAt,
          roles: newHistorique.backlog.roles,
          creator: newHistorique.backlog.creator,
        },
        activatedAt: newHistorique.activatedAt,
        activatedBy: newHistorique.activatedBy,
      },
    });
  } catch (error) {
    console.error("POST Historique API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const permissionCheck = await checkManagePermissions(req);
    if ("error" in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    const { session } = permissionCheck;

    await prisma.historiqueStatus.updateMany({
      where: { isActive: true },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedById: parseInt(session?.user?.id as string, 10),
      },
    });

    return NextResponse.json({
      message: "Historique deactivated successfully",
      activeHistorique: null,
    });
  } catch (error) {
    console.error("DELETE Historique API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

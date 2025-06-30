import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]/route";

// GET - Fetch all roles
export async function GET() {
  try {
    const roles = await prisma.role.findMany({
      select: { id: true, name: true },
    });
    return NextResponse.json(roles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
  }
}

// POST - Create a new role
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await request.json();

    if (!name?.trim() || typeof name !== "string") {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    const existingRole = await prisma.role.findFirst({
      where: { name: name.trim() },
    });

    if (existingRole) {
      return NextResponse.json({ error: "Role already exists" }, { status: 400 });
    }

    const role = await prisma.role.create({
      data: { name: name.trim() },
      select: { id: true, name: true },
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
  }
}

// DELETE - Delete a role by ID
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    const roleId = Number(id);

    if (!roleId || isNaN(roleId)) {
      return NextResponse.json({ error: "Valid numeric role ID is required" }, { status: 400 });
    }

    const existingRole = await prisma.role.findUnique({ where: { id: roleId } });

    if (!existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Prevent deletion of SUPERADMIN role
    if (existingRole.name === "SUPERADMIN") {
      return NextResponse.json({ error: "Cannot delete SUPERADMIN role" }, { status: 400 });
    }

    // Check if role is assigned to any users
    const assignedUsers = await prisma.user.count({
      where: { roleId: roleId },
    });

    if (assignedUsers > 0) {
      return NextResponse.json(
        { error: "Cannot delete role assigned to users" },
        { status: 400 }
      );
    }

    await prisma.role.delete({ where: { id: roleId } });

    return NextResponse.json({ message: "Role deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json({ error: "Failed to delete role" }, { status: 500 });
  }
}

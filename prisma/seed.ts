import { prisma } from "@/lib/prisma";  // ou import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient();
import bcrypt from "bcryptjs";

async function main() {
  const roles = ["IM", "SDM", "BUMTLS", "DIRECTEUR", "SUPERADMIN"];
  const permissions = [
    "VIEW_DASHBOARD",
    "MANAGE_USERS",
    "MANAGE_ROLES",
    "VIEW_N2",
    "MANAGE_N2",
  ];

  // Créer les permissions
  for (const name of permissions) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Créer les rôles et assigner permissions
  for (const name of roles) {
    const perms = name === "SUPERADMIN"
      ? await prisma.permission.findMany()
      : await prisma.permission.findMany({
          where: { name: { in: ["VIEW_DASHBOARD", "VIEW_N2"] } },
        });

    const permissionIds = perms.map((p) => p.id);

    await prisma.role.upsert({
      where: { name },
      update: {
        permissions: {
          set: permissionIds.map((id) => ({ id })),
        },
      },
      create: {
        name,
        permissions: {
          connect: permissionIds.map((id) => ({ id })),
        },
      },
    });
  }

  // Récupérer le rôle SUPERADMIN pour l'utilisateur admin
  const superAdminRole = await prisma.role.findUnique({
    where: { name: "SUPERADMIN" },
  });
  if (!superAdminRole) throw new Error("SUPERADMIN role not found");

  // Créer un utilisateur SUPERADMIN
  const superAdminPassword = await bcrypt.hash("superadmin123", 10);
  await prisma.user.upsert({
    where: { email: "superadmin@enterprise.com" },
    update: {},
    create: {
      email: "superadmin@enterprise.com",
      password: superAdminPassword,
      name: "Super Admin",
      roleId: superAdminRole.id,
    },
  });

  // Créer un utilisateur IM (exemple)
  const imRole = await prisma.role.findUnique({
    where: { name: "IM" },
  });
  if (!imRole) throw new Error("IM role not found");

  const imPassword = await bcrypt.hash("im123456", 10);
  await prisma.user.upsert({
    where: { email: "imuser@enterprise.com" },
    update: {},
    create: {
      email: "imuser@enterprise.com",
      password: imPassword,
      name: "IM User",
      roleId: imRole.id,
    },
  });

  console.log("✅ Seed complete with roles, permissions, and users!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

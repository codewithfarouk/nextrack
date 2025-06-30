-- AlterTable
ALTER TABLE "Permission" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "historique_status" (
    "id" TEXT NOT NULL,
    "backlogId" INTEGER NOT NULL,
    "activatedById" INTEGER NOT NULL,
    "deactivatedById" INTEGER,
    "activatedAt" TIMESTAMP(3) NOT NULL,
    "deactivatedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "historique_status_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "historique_status" ADD CONSTRAINT "historique_status_backlogId_fkey" FOREIGN KEY ("backlogId") REFERENCES "Backlog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_status" ADD CONSTRAINT "historique_status_activatedById_fkey" FOREIGN KEY ("activatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_status" ADD CONSTRAINT "historique_status_deactivatedById_fkey" FOREIGN KEY ("deactivatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

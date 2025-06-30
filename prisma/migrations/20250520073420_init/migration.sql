-- CreateTable
CREATE TABLE "_BacklogUsers" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_BacklogUsers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_BacklogUsers_B_index" ON "_BacklogUsers"("B");

-- AddForeignKey
ALTER TABLE "_BacklogUsers" ADD CONSTRAINT "_BacklogUsers_A_fkey" FOREIGN KEY ("A") REFERENCES "Backlog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BacklogUsers" ADD CONSTRAINT "_BacklogUsers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

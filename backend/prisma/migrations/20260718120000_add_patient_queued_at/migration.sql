-- AlterTable
ALTER TABLE "patients" ADD COLUMN "queuedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "patients_doctorId_queuedAt_idx" ON "patients"("doctorId", "queuedAt");
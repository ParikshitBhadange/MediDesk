-- CreateIndex
CREATE INDEX "patients_contact_idx" ON "patients"("contact");

-- CreateIndex
CREATE INDEX "patients_doctorId_createdAt_idx" ON "patients"("doctorId", "createdAt");

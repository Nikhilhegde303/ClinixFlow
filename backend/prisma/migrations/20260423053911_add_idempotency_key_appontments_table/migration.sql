/*
  Warnings:

  - A unique constraint covering the columns `[idempotency_key]` on the table `Appointment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "idempotency_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_idempotency_key_key" ON "Appointment"("idempotency_key");

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('PENDING', 'CONTACTED', 'CONVERTED', 'REJECTED');

-- CreateTable
CREATE TABLE "HospitalLead" (
    "id" TEXT NOT NULL,
    "clinic_name" TEXT NOT NULL,
    "contact_person" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalLead_pkey" PRIMARY KEY ("id")
);

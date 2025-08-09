-- CreateEnum
CREATE TYPE "public"."InsuranceType" AS ENUM ('LIFE', 'DISABILITY');

-- CreateTable
CREATE TABLE "public"."Insurance" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "public"."InsuranceType" NOT NULL,
    "coverage" DOUBLE PRECISION NOT NULL,
    "premium" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Insurance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Insurance_clientId_type_idx" ON "public"."Insurance"("clientId", "type");

-- AddForeignKey
ALTER TABLE "public"."Insurance" ADD CONSTRAINT "Insurance_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "PraticienConfirmStatus" AS ENUM ('pending', 'confirmed', 'refused');

-- AlterTable: add new column with default
ALTER TABLE "patients" ADD COLUMN "praticien_confirm_status" "PraticienConfirmStatus" NOT NULL DEFAULT 'pending';

-- Migrate existing data: true → confirmed
UPDATE "patients" SET "praticien_confirm_status" = 'confirmed' WHERE "is_praticien_confirmed" = true;

-- DropColumn
ALTER TABLE "patients" DROP COLUMN "is_praticien_confirmed";

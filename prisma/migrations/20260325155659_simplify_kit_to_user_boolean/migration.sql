/*
  Warnings:

  - You are about to drop the `kit_installations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "kit_installations" DROP CONSTRAINT "kit_installations_user_id_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "kit_installed" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "kit_installations";

-- DropEnum
DROP TYPE "KitStatus";

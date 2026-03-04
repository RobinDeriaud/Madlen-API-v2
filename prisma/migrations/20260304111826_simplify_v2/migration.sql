/*
  Warnings:

  - You are about to drop the column `document_id` on the `exercices` table. All the data in the column will be lost.
  - You are about to drop the column `document_id` on the `page_statiques` table. All the data in the column will be lost.
  - You are about to drop the column `document_id` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `document_id` on the `praticiens` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ReponseElement" AS ENUM ('null', 'oui', 'non');

-- DropIndex
DROP INDEX "exercices_document_id_key";

-- DropIndex
DROP INDEX "page_statiques_document_id_key";

-- DropIndex
DROP INDEX "patients_document_id_key";

-- DropIndex
DROP INDEX "praticiens_document_id_key";

-- AlterTable
ALTER TABLE "exercices" DROP COLUMN "document_id";

-- AlterTable
ALTER TABLE "page_statiques" DROP COLUMN "document_id";

-- AlterTable
ALTER TABLE "patients" DROP COLUMN "document_id";

-- AlterTable
ALTER TABLE "praticiens" DROP COLUMN "document_id";

-- CreateTable
CREATE TABLE "liste_elements" (
    "id" SERIAL NOT NULL,
    "element" TEXT,
    "reponse" "ReponseElement" DEFAULT 'null',
    "field_order" INTEGER,
    "exercice_id" INTEGER,

    CONSTRAINT "liste_elements_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "liste_elements" ADD CONSTRAINT "liste_elements_exercice_id_fkey" FOREIGN KEY ("exercice_id") REFERENCES "exercices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

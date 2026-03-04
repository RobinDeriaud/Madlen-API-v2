/*
  Warnings:

  - You are about to drop the `components_element_exercice_elements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `components_element_liste_elements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `components_element_parcours_elements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `components_liste_parcours` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `prescriptions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `suivi_patients` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "components_element_exercice_elements" DROP CONSTRAINT "components_element_exercice_elements_exercice_id_fkey";

-- DropForeignKey
ALTER TABLE "components_element_exercice_elements" DROP CONSTRAINT "components_element_exercice_elements_prescription_id_fkey";

-- DropForeignKey
ALTER TABLE "components_element_liste_elements" DROP CONSTRAINT "components_element_liste_elements_exercice_id_fkey";

-- DropForeignKey
ALTER TABLE "components_element_parcours_elements" DROP CONSTRAINT "components_element_parcours_elements_exercice_id_fkey";

-- DropForeignKey
ALTER TABLE "components_element_parcours_elements" DROP CONSTRAINT "components_element_parcours_elements_parcours_id_fkey";

-- DropForeignKey
ALTER TABLE "components_liste_parcours" DROP CONSTRAINT "components_liste_parcours_prescription_id_fkey";

-- DropForeignKey
ALTER TABLE "prescriptions" DROP CONSTRAINT "prescriptions_praticien_creator_id_fkey";

-- DropForeignKey
ALTER TABLE "prescriptions" DROP CONSTRAINT "prescriptions_suivi_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "suivi_patients" DROP CONSTRAINT "suivi_patients_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "suivi_patients" DROP CONSTRAINT "suivi_patients_praticien_id_fkey";

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "praticien_id" INTEGER;

-- DropTable
DROP TABLE "components_element_exercice_elements";

-- DropTable
DROP TABLE "components_element_liste_elements";

-- DropTable
DROP TABLE "components_element_parcours_elements";

-- DropTable
DROP TABLE "components_liste_parcours";

-- DropTable
DROP TABLE "prescriptions";

-- DropTable
DROP TABLE "suivi_patients";

-- DropEnum
DROP TYPE "ReponseElement";

-- CreateTable
CREATE TABLE "listes" (
    "id" SERIAL NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "patient_id" INTEGER NOT NULL,

    CONSTRAINT "listes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ExerciceToListe" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ExerciceToListe_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ExerciceToListe_B_index" ON "_ExerciceToListe"("B");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_praticien_id_fkey" FOREIGN KEY ("praticien_id") REFERENCES "praticiens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listes" ADD CONSTRAINT "listes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExerciceToListe" ADD CONSTRAINT "_ExerciceToListe_A_fkey" FOREIGN KEY ("A") REFERENCES "exercices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExerciceToListe" ADD CONSTRAINT "_ExerciceToListe_B_fkey" FOREIGN KEY ("B") REFERENCES "listes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "suivi_patients" (
    "id" SERIAL NOT NULL,
    "is_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "date_debut_suivi" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "praticien_id" INTEGER NOT NULL,

    CONSTRAINT "suivi_patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" SERIAL NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "delivered_at" TIMESTAMP(3),
    "exercices_par_jour" INTEGER,
    "exercices" JSONB DEFAULT '[]',
    "parcours" JSONB DEFAULT '[]',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "praticien_creator_id" INTEGER NOT NULL,
    "suivi_patient_id" INTEGER NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_files" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mime" TEXT,
    "size" INTEGER,
    "ext" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "exercice_id" INTEGER,

    CONSTRAINT "audio_files_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "suivi_patients" ADD CONSTRAINT "suivi_patients_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suivi_patients" ADD CONSTRAINT "suivi_patients_praticien_id_fkey" FOREIGN KEY ("praticien_id") REFERENCES "praticiens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_praticien_creator_id_fkey" FOREIGN KEY ("praticien_creator_id") REFERENCES "praticiens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_suivi_patient_id_fkey" FOREIGN KEY ("suivi_patient_id") REFERENCES "suivi_patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_files" ADD CONSTRAINT "audio_files_exercice_id_fkey" FOREIGN KEY ("exercice_id") REFERENCES "exercices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

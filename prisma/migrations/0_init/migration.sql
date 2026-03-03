-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('null', 'patient', 'praticien');

-- CreateEnum
CREATE TYPE "Sexe" AS ENUM ('féminin', 'masculin');

-- CreateEnum
CREATE TYPE "ReponseElement" AS ENUM ('null', 'oui', 'non');

-- CreateEnum
CREATE TYPE "Recurrence" AS ENUM ('faible', 'moyenne', 'haute');

-- CreateEnum
CREATE TYPE "OutilExercice" AS ENUM ('spectrogramme', 'prosodie', 'puissance', 'image', 'diado', 'phoneme', 'phonetogramme', 'mots', 'traits', 'praxies', 'choix', 'video', 'lien', 'histogramme');

-- CreateEnum
CREATE TYPE "MacroExercice" AS ENUM ('AJUSTEMENT_100', 'HYGIENE_PHONATOIRE_200', 'PRAXIES_300', 'RENDEMENT_VOCAL_400', 'FLEXIBILITE_VOCALE_500', 'INTELLIGIBILITE_600', 'FLUENCE_700');

-- CreateEnum
CREATE TYPE "AxeExercice" AS ENUM ('AJUSTEMENT_100', 'REGULATION_ECHANGES_130', 'POSTURE_140', 'HYGIENE_ALIMENTAIRE_210', 'ECONOMIE_VOCALE_220', 'ECHAUFFEMENT_RECUPERATION_230', 'EXERCICES_SPECIFIQUES_240', 'PROPRIOCEPTION_ARTICULATOIRE_310', 'PRAXIES_SIMPLES_320', 'PRAXIES_COORDONNEES_330', 'RESPIRATION_410', 'RESPIRATION_AVANCEE_420', 'TONICITE_LABIALE_430', 'TONICITE_VELAIRE_440', 'TONICITE_LINGUALE_450', 'CONTROLE_HAUTEUR_510', 'PASSAGES_MECANISMES_520', 'CONTROLE_INTENSITE_530', 'DISSOCIATION_PARAMETRES_540', 'DYNAMIQUE_VOCALE_550', 'PRODUCTION_VOYELLES_610', 'PRODUCTION_CONSONNES_620', 'SYLLABES_PROCESSUS_630', 'TRAVAIL_PROSODIE_640', 'DIADOCOCINETIQUES_CONSONANTIQUES_710', 'DIADOCOCINETIQUES_VOCALIQUES_720', 'DIADOCOCINETIQUES_COORDONNEES_730', 'DIADOCOCINETIQUES_MOTS_740', 'PHRASES_FONCTIONNELLES_750');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "up_users" (
    "id" SERIAL NOT NULL,
    "document_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "nom" TEXT,
    "prenom" TEXT,
    "provider" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "profile_completed" BOOLEAN NOT NULL DEFAULT false,
    "user_type" "UserType" NOT NULL DEFAULT 'null',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "up_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" SERIAL NOT NULL,
    "document_id" TEXT NOT NULL,
    "age" INTEGER,
    "sexe" "Sexe",
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "users_permissions_user_id" INTEGER,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "praticiens" (
    "id" SERIAL NOT NULL,
    "document_id" TEXT NOT NULL,
    "numero_adeli" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "users_permissions_user_id" INTEGER,

    CONSTRAINT "praticiens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercices" (
    "id" SERIAL NOT NULL,
    "document_id" TEXT NOT NULL,
    "numero" INTEGER,
    "nom" TEXT,
    "sigle" TEXT,
    "bref" TEXT,
    "but" TEXT,
    "instructions" TEXT,
    "astuce" TEXT,
    "commentaires" TEXT,
    "axe" "AxeExercice",
    "macro" "MacroExercice",
    "outil" "OutilExercice",
    "outil_param" TEXT,
    "duree" INTEGER NOT NULL DEFAULT 2,
    "recurrence" "Recurrence",
    "auteur" TEXT,
    "version" TEXT,
    "date" DATE,
    "boutons" JSONB,
    "fichier" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suivi_patients" (
    "id" SERIAL NOT NULL,
    "document_id" TEXT NOT NULL,
    "actif" BOOLEAN,
    "archived" BOOLEAN,
    "is_confirmed" BOOLEAN,
    "date_debut_suivi" DATE,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "patient_id" INTEGER,
    "praticien_id" INTEGER,

    CONSTRAINT "suivi_patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" SERIAL NOT NULL,
    "document_id" TEXT NOT NULL,
    "delivered_at" DATE,
    "exercices_par_jour" INTEGER,
    "is_active" BOOLEAN,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "praticien_creator_id" INTEGER,
    "suivi_patient_id" INTEGER,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_statiques" (
    "id" SERIAL NOT NULL,
    "document_id" TEXT NOT NULL,
    "nom" TEXT,
    "slug" TEXT,
    "contenu" TEXT,
    "date_modified" DATE,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_statiques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "components_element_exercice_elements" (
    "id" SERIAL NOT NULL,
    "repetition" INTEGER,
    "field_order" INTEGER,
    "exercice_id" INTEGER,
    "prescription_id" INTEGER,

    CONSTRAINT "components_element_exercice_elements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "components_element_liste_elements" (
    "id" SERIAL NOT NULL,
    "element" TEXT,
    "reponse" "ReponseElement" DEFAULT 'null',
    "field_order" INTEGER,
    "exercice_id" INTEGER,

    CONSTRAINT "components_element_liste_elements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "components_element_parcours_elements" (
    "id" SERIAL NOT NULL,
    "is_done" BOOLEAN,
    "field_order" INTEGER,
    "exercice_id" INTEGER,
    "parcours_id" INTEGER,

    CONSTRAINT "components_element_parcours_elements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "components_liste_parcours" (
    "id" SERIAL NOT NULL,
    "date" DATE,
    "is_done" BOOLEAN,
    "field_order" INTEGER,
    "prescription_id" INTEGER,

    CONSTRAINT "components_liste_parcours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "up_users_document_id_key" ON "up_users"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "up_users_username_key" ON "up_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "up_users_email_key" ON "up_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "patients_document_id_key" ON "patients"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "patients_users_permissions_user_id_key" ON "patients"("users_permissions_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "praticiens_document_id_key" ON "praticiens"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "praticiens_users_permissions_user_id_key" ON "praticiens"("users_permissions_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "exercices_document_id_key" ON "exercices"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "exercices_numero_key" ON "exercices"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "suivi_patients_document_id_key" ON "suivi_patients"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_document_id_key" ON "prescriptions"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_statiques_document_id_key" ON "page_statiques"("document_id");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_users_permissions_user_id_fkey" FOREIGN KEY ("users_permissions_user_id") REFERENCES "up_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "praticiens" ADD CONSTRAINT "praticiens_users_permissions_user_id_fkey" FOREIGN KEY ("users_permissions_user_id") REFERENCES "up_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suivi_patients" ADD CONSTRAINT "suivi_patients_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suivi_patients" ADD CONSTRAINT "suivi_patients_praticien_id_fkey" FOREIGN KEY ("praticien_id") REFERENCES "praticiens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_praticien_creator_id_fkey" FOREIGN KEY ("praticien_creator_id") REFERENCES "praticiens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_suivi_patient_id_fkey" FOREIGN KEY ("suivi_patient_id") REFERENCES "suivi_patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "components_element_exercice_elements" ADD CONSTRAINT "components_element_exercice_elements_exercice_id_fkey" FOREIGN KEY ("exercice_id") REFERENCES "exercices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "components_element_exercice_elements" ADD CONSTRAINT "components_element_exercice_elements_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "components_element_liste_elements" ADD CONSTRAINT "components_element_liste_elements_exercice_id_fkey" FOREIGN KEY ("exercice_id") REFERENCES "exercices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "components_element_parcours_elements" ADD CONSTRAINT "components_element_parcours_elements_exercice_id_fkey" FOREIGN KEY ("exercice_id") REFERENCES "exercices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "components_element_parcours_elements" ADD CONSTRAINT "components_element_parcours_elements_parcours_id_fkey" FOREIGN KEY ("parcours_id") REFERENCES "components_liste_parcours"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "components_liste_parcours" ADD CONSTRAINT "components_liste_parcours_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

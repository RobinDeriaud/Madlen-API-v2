-- CreateEnum
CREATE TYPE "KitStatus" AS ENUM ('pending', 'done');

-- CreateTable
CREATE TABLE "kit_installations" (
    "id" SERIAL NOT NULL,
    "stripe_session_id" TEXT NOT NULL,
    "status" "KitStatus" NOT NULL DEFAULT 'pending',
    "purchased_at" TIMESTAMPTZ NOT NULL,
    "installed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "kit_installations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kit_installations_stripe_session_id_key" ON "kit_installations"("stripe_session_id");

-- AddForeignKey
ALTER TABLE "kit_installations" ADD CONSTRAINT "kit_installations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

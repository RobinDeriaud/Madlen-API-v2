-- AlterTable
ALTER TABLE "users" ADD COLUMN     "licence_active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "licence_expires_at" TIMESTAMPTZ,
ADD COLUMN     "licence_product_name" TEXT,
ADD COLUMN     "licence_purchased_at" TIMESTAMPTZ;

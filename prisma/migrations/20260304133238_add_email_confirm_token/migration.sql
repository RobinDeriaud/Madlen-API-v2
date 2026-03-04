-- AlterTable
ALTER TABLE "listes" ALTER COLUMN "is_active" SET DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_confirm_expiry" TIMESTAMP(3),
ADD COLUMN     "email_confirm_token" TEXT;

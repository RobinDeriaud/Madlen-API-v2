-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_change_expiry" TIMESTAMP(3),
ADD COLUMN     "email_change_new_email" TEXT,
ADD COLUMN     "email_change_token" TEXT;

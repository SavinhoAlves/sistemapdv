-- AlterTable
ALTER TABLE "configuracoes" ADD COLUMN     "mp_access_token" TEXT,
ADD COLUMN     "mp_ativado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mp_device_id" TEXT;

-- AlterTable
ALTER TABLE "escalation_rules" ADD COLUMN     "excludeFromDocument" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "integrations" ADD COLUMN     "excludeFromDocument" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "kpis" ADD COLUMN     "excludeFromDocument" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "scenarios" ADD COLUMN     "excludeFromDocument" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "scope_items" ADD COLUMN     "excludeFromDocument" BOOLEAN NOT NULL DEFAULT false;

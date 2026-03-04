-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "StepType" AS ENUM ('HTTP', 'EMAIL', 'DATABASE', 'SCRIPT', 'WEBHOOK', 'CONDITIONAL', 'LOOP', 'PARALLEL', 'MANUAL_APPROVAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('ACTIVE', 'DISABLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED', 'TIMEOUT', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_steps" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "StepType" NOT NULL,
    "order" INTEGER NOT NULL,
    "config" JSONB,
    "status" "StepStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_logs" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "workflowStepId" TEXT,
    "status" "ExecutionStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "execution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "workflows_createdBy_idx" ON "workflows"("createdBy");

-- CreateIndex
CREATE INDEX "workflow_steps_workflowId_idx" ON "workflow_steps"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_steps_workflowId_order_key" ON "workflow_steps"("workflowId", "order");

-- CreateIndex
CREATE INDEX "execution_logs_workflowId_idx" ON "execution_logs"("workflowId");

-- CreateIndex
CREATE INDEX "execution_logs_workflowStepId_idx" ON "execution_logs"("workflowStepId");

-- CreateIndex
CREATE INDEX "execution_logs_status_idx" ON "execution_logs"("status");

-- CreateIndex
CREATE INDEX "execution_logs_createdAt_idx" ON "execution_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_workflowStepId_fkey" FOREIGN KEY ("workflowStepId") REFERENCES "workflow_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;


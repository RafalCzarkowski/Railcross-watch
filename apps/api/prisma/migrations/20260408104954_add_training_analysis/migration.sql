-- AlterTable
ALTER TABLE "TrainingAsset" ADD COLUMN     "analysisError" TEXT,
ADD COLUMN     "analysisStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "detectionsJson" TEXT,
ADD COLUMN     "framesCount" INTEGER,
ADD COLUMN     "framesDir" TEXT,
ADD COLUMN     "trainedModelPath" TEXT;

-- CreateTable
CREATE TABLE "TrainingRun" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "epochs" INTEGER NOT NULL DEFAULT 50,
    "modelPath" TEXT,
    "metrics" TEXT,
    "errorMsg" TEXT,
    "startedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingRun_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TrainingRun" ADD CONSTRAINT "TrainingRun_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

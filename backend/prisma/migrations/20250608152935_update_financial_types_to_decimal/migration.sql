/*
  Warnings:

  - You are about to alter the column `amount` on the `CardTransaction` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `balance` on the `Cards` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `amount` on the `Deposits` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `calculated_total_payout` on the `Deposits` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `amount_paid` on the `LoanPayment` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `principal_paid` on the `LoanPayment` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `interest_paid` on the `LoanPayment` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `outstanding_principal_after_payment` on the `LoanPayment` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `amount` on the `Loans` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `monthly_payment_amount` on the `Loans` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `outstanding_principal` on the `Loans` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `paid_amount` on the `Loans` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `accrued_penalty` on the `Loans` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.

*/
-- AlterTable
ALTER TABLE "CardTransaction" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Cards" ALTER COLUMN "balance" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Deposits" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "calculated_total_payout" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "LoanPayment" ALTER COLUMN "amount_paid" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "principal_paid" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "interest_paid" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "outstanding_principal_after_payment" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Loans" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "monthly_payment_amount" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "outstanding_principal" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "paid_amount" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "accrued_penalty" SET DATA TYPE DECIMAL(65,30);

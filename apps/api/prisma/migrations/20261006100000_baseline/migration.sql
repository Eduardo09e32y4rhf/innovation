-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DEV', 'CEO', 'CONTABIL', 'COMERCIAL', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA');

-- CreateEnum
CREATE TYPE "CEOOnboardingState" AS ENUM ('INVITED', 'PASSWORD_CHANGE', 'FACE_ENROLLMENT', 'PROFILE_REQUIRED', 'CONTRACT_PENDING', 'ACTIVE');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'BASE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('TRIAL', 'PENDING_PAYMENT', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "WhatsappStatus" AS ENUM ('DISCONNECTED', 'CONNECTING', 'QR_CODE', 'CONNECTED');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'PENDING', 'CLOSED');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('OPEN', 'CLOSED', 'DRAFT');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('NEW', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FinancialTransactionType" AS ENUM ('REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinancialTransactionStatus" AS ENUM ('PENDING', 'PAID', 'CANCELED');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'ONBOARDING', 'INACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "VacationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "VacationEntitlementStatus" AS ENUM ('OPEN', 'EXHAUSTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VacationPaymentStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MedicalCertificateType" AS ENUM ('FULL_DAY', 'HOURS', 'DAYS');

-- CreateEnum
CREATE TYPE "MedicalCertificateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollTaxType" AS ENUM ('INSS', 'IRRF', 'FGTS', 'PAYROLL_PARAMS');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SIMPLE_NOTICE', 'PROMOTION_NOTICE', 'RH_NOTICE', 'VACATION_NOTICE', 'WARNING_NOTICE', 'SUSPENSION_NOTICE', 'DOCUMENT_NOTICE', 'SYSTEM_NOTICE', 'PLATFORM_NOTICE', 'URGENT_NOTICE');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED', 'PENDING_RESPONSE', 'ACCEPTED', 'REFUSED', 'ACKNOWLEDGED', 'REFUSED_ACKNOWLEDGMENT', 'DRAFT', 'SENT', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationTargetType" AS ENUM ('USER', 'EMPLOYEE', 'DEPARTMENT', 'ROLE', 'ALL');

-- CreateEnum
CREATE TYPE "TimeRuleStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TimeOccurrenceType" AS ENUM ('LATE_ARRIVAL', 'EARLY_LEAVE', 'ABSENCE', 'JUSTIFIED_ABSENCE', 'UNJUSTIFIED_ABSENCE', 'MEDICAL_CERTIFICATE', 'MANUAL_ADJUSTMENT', 'MISSING_PUNCH', 'OVERTIME', 'NEGATIVE_BALANCE', 'POSITIVE_BALANCE', 'DAY_OFF', 'DSR', 'HOLIDAY', 'VACATION', 'LEAVE', 'EXTERNAL_WORK', 'HOME_OFFICE', 'TRAINING');

-- CreateEnum
CREATE TYPE "CommitmentType" AS ENUM ('DOCUMENT_DELIVERY', 'DOCUMENT_SIGNATURE', 'MEDICAL_EXAM', 'RETURN_FROM_LEAVE', 'MEETING_RH', 'RENEWAL', 'ADMIN_PENDING', 'VACATION', 'WARNING', 'SUSPENSION', 'TRAINING', 'ONBOARDING', 'OTHER');

-- CreateEnum
CREATE TYPE "CommitmentStatus" AS ENUM ('PENDING', 'TODAY', 'OVERDUE', 'UPCOMING', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "CommitmentPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "AsoType" AS ENUM ('ADMISSIONAL', 'PERIODICO', 'RETORNO_AO_TRABALHO', 'MUDANCA_DE_FUNCAO', 'DEMISSIONAL', 'COMPLEMENTAR');

-- CreateEnum
CREATE TYPE "AsoStatus" AS ENUM ('PENDING', 'SCHEDULED', 'COMPLETED', 'NEAR_EXPIRATION', 'EXPIRED', 'CANCELLED', 'WAITING_DOCUMENT', 'WAITING_ADDITIONAL_EXAM');

-- CreateEnum
CREATE TYPE "AsoResult" AS ENUM ('APTO', 'INAPTO');

-- CreateEnum
CREATE TYPE "AttachmentOwnerType" AS ENUM ('COMMITMENT', 'ASO', 'EMPLOYEE', 'NOTIFICATION');

-- CreateEnum
CREATE TYPE "ActivityEntityType" AS ENUM ('COMMITMENT', 'ASO', 'EMPLOYEE', 'NOTIFICATION');

-- CreateEnum
CREATE TYPE "HolidayScope" AS ENUM ('NATIONAL', 'STATE', 'MUNICIPAL');

-- CreateEnum
CREATE TYPE "TimeClosingStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('OPEN', 'PAID', 'OVERDUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SwapRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupportTicketSource" AS ENUM ('AUTHENTICATED', 'LOGIN_PUBLIC', 'PASSWORD_RESET', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SupportTicketCategory" AS ENUM ('BUG', 'CORRECTION', 'ADJUSTMENT', 'MAINTENANCE', 'FEATURE_REQUEST', 'PASSWORD_RESET', 'ACCESS', 'BILLING', 'PERFORMANCE', 'SECURITY', 'INTEGRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('NEW', 'TRIAGE', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_DEPLOY', 'RESOLVED', 'CLOSED', 'REOPENED', 'DUPLICATE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SupportMessageVisibility" AS ENUM ('PUBLIC', 'INTERNAL');

-- CreateEnum
CREATE TYPE "SupportAttachmentStatus" AS ENUM ('QUARANTINED', 'SCANNING', 'CLEAN', 'REJECTED', 'DELETED');

-- CreateEnum
CREATE TYPE "SupportAttachmentType" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "GeneratedDocumentType" AS ENUM ('REPORT', 'CONTRACT', 'PAYSLIP', 'OTHER');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PROCESSING', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollItemType" AS ENUM ('BASE_SALARY', 'OVERTIME', 'NIGHT_SHIFT', 'BONUS', 'COMMISSION', 'VACATION_ADDITION', 'INSS', 'IRRF', 'FGTS', 'ADVANCE', 'ABSENCE_DEDUCTION', 'OTHER_EARNING', 'OTHER_DEDUCTION');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OnboardingTaskType" AS ENUM ('DOCUMENT_UPLOAD', 'FORM_FILL', 'CONTRACT_SIGN', 'TRAINING', 'SYSTEM_ACCESS', 'OTHER');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "PartnerInvoiceStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TimeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PunchType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'ELIGIBLE', 'PAID', 'CANCELED', 'REVERSED');

-- CreateEnum
CREATE TYPE "ScheduleRequestType" AS ENUM ('TROCA_FOLGA', 'TROCA_TURNO', 'NOVA_ESCALA', 'AJUSTE_BATIDA', 'JUSTIFICATIVA', 'FOLGA_COMPENSACAO');

-- CreateEnum
CREATE TYPE "ScheduleRequestStatus" AS ENUM ('AWAITING_PEER', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Company" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "legalName" TEXT,
    "document" TEXT,
    "logoUrl" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "stateRegistration" TEXT,
    "municipalRegistration" TEXT,
    "zipCode" TEXT,
    "street" TEXT,
    "streetNumber" TEXT,
    "addressComplement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "legalRepresentativeName" TEXT,
    "legalRepresentativeCpf" TEXT,
    "legalRepresentativeRole" TEXT,
    "legalRepresentativeEmail" TEXT,
    "legalRepresentativePhone" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "radiusTolerance" INTEGER DEFAULT 150,
    "primaryColor" TEXT,
    "theme" TEXT DEFAULT 'light',
    "commercialOwnerId" UUID,
    "subscriptionStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suspensionReason" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "plan" "PlanType" NOT NULL DEFAULT 'FREE',
    "billingStatus" "BillingStatus" NOT NULL DEFAULT 'TRIAL',
    "trialEndsAt" TIMESTAMP(3),
    "maxUsers" INTEGER NOT NULL DEFAULT 6,
    "maxEmployees" INTEGER NOT NULL DEFAULT 50,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "payrollStartDay" INTEGER NOT NULL DEFAULT 1,
    "activeModules" TEXT[] DEFAULT ARRAY['employees', 'time-track', 'vacations', 'management']::TEXT[],
    "asaasCustomerId" TEXT,
    "asaasSubscriptionId" TEXT,
    "internalNotes" TEXT,
    "platformPlanId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "forcePasswordChange" BOOLEAN NOT NULL DEFAULT false,
    "role" "UserRole" NOT NULL DEFAULT 'FUNCIONARIO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "previousPasswords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resetPasswordCode" TEXT,
    "resetPasswordExpires" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "customPermissions" JSONB,
    "onboardingState" "CEOOnboardingState",
    "onboardingCompletedAt" TIMESTAMP(3),
    "blockedAt" TIMESTAMP(3),
    "blockedReason" TEXT,
    "canceledAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "mfaSecretEnc" TEXT,
    "mfaEnabledAt" TIMESTAMP(3),
    "mfaRecoveryHashes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemporaryCredential" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revealCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemporaryCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CEOProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "legalName" TEXT,
    "cpf" TEXT,
    "birthDate" TIMESTAMP(3),
    "data" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CEOProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CEOContract" (
    "id" UUID NOT NULL,
    "ceoUserId" UUID NOT NULL,
    "issuedById" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "pdfDocumentId" TEXT,
    "challengeHash" TEXT,
    "challengeExpiresAt" TIMESTAMP(3),
    "challengeUsedAt" TIMESTAMP(3),
    "signatureHash" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CEOContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "userId" UUID,
    "originCandidateId" UUID,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "secondaryPhone" TEXT,
    "rg" TEXT,
    "rgIssuer" TEXT,
    "rgState" TEXT,
    "rgDate" TEXT,
    "pis" TEXT,
    "pisFirstJob" BOOLEAN DEFAULT false,
    "gender" TEXT,
    "maritalStatus" TEXT,
    "nationality" TEXT,
    "birthplace" TEXT,
    "education" TEXT,
    "motherName" TEXT,
    "fatherName" TEXT,
    "voterTitle" TEXT,
    "voterZone" TEXT,
    "voterSection" TEXT,
    "voterState" TEXT,
    "reservist" TEXT,
    "cnh" TEXT,
    "cnhCategory" TEXT,
    "cnhExpiry" TEXT,
    "cep" TEXT,
    "street" TEXT,
    "streetNumber" TEXT,
    "addressComplement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "observations" TEXT,
    "birthDate" TIMESTAMP(3),
    "registration" TEXT,
    "position" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "managerId" UUID,
    "admissionDate" TIMESTAMP(3) NOT NULL,
    "terminationDate" TIMESTAMP(3),
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "salary" DECIMAL(12,2),
    "contractType" TEXT,
    "cnpj" TEXT,
    "legalName" TEXT,
    "tradeName" TEXT,
    "unit" TEXT,
    "workScale" TEXT,
    "workScheduleRuleId" UUID,
    "customWorkScale" TEXT,
    "dailyWorkload" TEXT,
    "standardEntry" TEXT,
    "standardLunchStart" TEXT,
    "standardLunchReturn" TEXT,
    "standardExit" TEXT,
    "suspensionReason" TEXT,
    "allowExternalWork" BOOLEAN NOT NULL DEFAULT false,
    "bankCode" TEXT,
    "bankName" TEXT,
    "bankAgency" TEXT,
    "bankAccount" TEXT,
    "bankAccountType" TEXT,
    "dependents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeTrack" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "entry" TIMESTAMP(3),
    "lunchStart" TIMESTAMP(3),
    "lunchReturn" TIMESTAMP(3),
    "exit" TIMESTAMP(3),
    "totalWorked" INTEGER,
    "dailyBalance" INTEGER,
    "overtime50Minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime100Minutes" INTEGER NOT NULL DEFAULT 0,
    "nightShiftMinutes" INTEGER NOT NULL DEFAULT 0,
    "incidentType" TEXT,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "earlyLeaveMinutes" INTEGER NOT NULL DEFAULT 0,
    "toleranceMinutes" INTEGER,
    "absenceMinutes" INTEGER,
    "clockedInWithoutFacial" BOOLEAN NOT NULL DEFAULT false,
    "overtimeApprovalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "overtimeExceedsLimit" BOOLEAN NOT NULL DEFAULT false,
    "overtimeApprovedAt" TIMESTAMP(3),
    "overtimeApprovedByUserId" UUID,
    "overtimeHandling" TEXT NOT NULL DEFAULT 'PAYMENT',
    "overtimeBankMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimePaymentMinutes" INTEGER NOT NULL DEFAULT 0,
    "manualReason" TEXT,
    "manualStatus" TEXT DEFAULT 'approved',
    "observation" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkScheduleRule" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "standardEntry" TEXT,
    "standardExit" TEXT,
    "breakMinutes" INTEGER NOT NULL DEFAULT 60,
    "dailyMinutes" INTEGER NOT NULL DEFAULT 480,
    "weeklyMinutes" INTEGER NOT NULL DEFAULT 2400,
    "lateToleranceMinutes" INTEGER NOT NULL DEFAULT 10,
    "earlyLeaveToleranceMinutes" INTEGER NOT NULL DEFAULT 10,
    "overtimeToleranceMinutes" INTEGER NOT NULL DEFAULT 5,
    "maxDailyOvertimeMinutes" INTEGER NOT NULL DEFAULT 120,
    "maxMonthlyOvertimeMinutes" INTEGER NOT NULL DEFAULT 2400,
    "workScale" TEXT NOT NULL DEFAULT '5x2',
    "restDaysOfWeek" INTEGER[] DEFAULT ARRAY[0, 6]::INTEGER[],
    "nightShiftEnabled" BOOLEAN NOT NULL DEFAULT false,
    "nightStartTime" TEXT NOT NULL DEFAULT '22:00',
    "nightEndTime" TEXT NOT NULL DEFAULT '05:00',
    "nightShiftPercent" INTEGER NOT NULL DEFAULT 20,
    "normalOvertimePercent" INTEGER NOT NULL DEFAULT 50,
    "holidayOvertimePercent" INTEGER NOT NULL DEFAULT 100,
    "closingStartDay" INTEGER NOT NULL DEFAULT 1,
    "closingEndDay" INTEGER NOT NULL DEFAULT 31,
    "adjustmentDeadlineDay" INTEGER NOT NULL DEFAULT 5,
    "managerApprovalDeadlineDay" INTEGER NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkScheduleRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeOccurrence" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "timeTrackId" UUID,
    "type" "TimeOccurrenceType" NOT NULL,
    "date" DATE NOT NULL,
    "minutes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "observation" TEXT,
    "createdByUserId" UUID,
    "approvedByUserId" UUID,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vacation" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "entitlementId" UUID,
    "acquisitionPeriod" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "daysUsed" INTEGER NOT NULL,
    "soldDays" INTEGER NOT NULL DEFAULT 0,
    "paymentDueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "status" "VacationStatus" NOT NULL DEFAULT 'PENDING',
    "observation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vacation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacationEntitlement" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "acquisitionStart" DATE NOT NULL,
    "acquisitionEnd" DATE NOT NULL,
    "concessionStart" DATE NOT NULL,
    "concessionEnd" DATE NOT NULL,
    "originalDays" INTEGER NOT NULL DEFAULT 30,
    "entitledDays" INTEGER NOT NULL,
    "reservedDays" INTEGER NOT NULL DEFAULT 0,
    "usedDays" INTEGER NOT NULL DEFAULT 0,
    "soldDays" INTEGER NOT NULL DEFAULT 0,
    "unjustifiedAbsences" INTEGER NOT NULL DEFAULT 0,
    "ruleVersion" TEXT NOT NULL DEFAULT 'CLT_VACATION_2026_1',
    "status" "VacationEntitlementStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VacationEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacationPayment" (
    "id" UUID NOT NULL,
    "vacationId" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "dueDate" DATE NOT NULL,
    "paidAt" TIMESTAMP(3),
    "status" "VacationPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "reference" TEXT,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VacationPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacationAuditLog" (
    "id" UUID NOT NULL,
    "vacationId" UUID,
    "entitlementId" UUID,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "actorUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VacationAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalCertificate" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "certificateType" "MedicalCertificateType" NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "coveredMinutes" INTEGER NOT NULL,
    "issueDate" DATE NOT NULL,
    "issuerName" TEXT,
    "issuerRegistration" TEXT,
    "documentId" TEXT,
    "status" "MedicalCertificateStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdByUserId" UUID,
    "reviewedByUserId" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollTaxTable" (
    "id" UUID NOT NULL,
    "taxType" "PayrollTaxType" NOT NULL,
    "version" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "brackets" JSONB NOT NULL,
    "parameters" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollTaxTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "management_events" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" TEXT NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3),
    "responsibleUserId" UUID,
    "employeeId" UUID,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "priority" TEXT NOT NULL DEFAULT 'MEDIA',
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "management_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_aso_records" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "asoType" "AsoType" NOT NULL,
    "examDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "status" "AsoStatus" NOT NULL DEFAULT 'PENDING',
    "result" "AsoResult",
    "clinicName" TEXT,
    "doctorName" TEXT,
    "documentNumber" TEXT,
    "observation" TEXT,
    "attachmentId" TEXT,
    "createdBy" UUID,
    "updatedBy" UUID,
    "completedBy" UUID,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_aso_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aso_clinic_presets" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cep" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "phone" TEXT,
    "doctorName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aso_clinic_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commitments" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "CommitmentType" NOT NULL,
    "status" "CommitmentStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "CommitmentPriority" NOT NULL DEFAULT 'NORMAL',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "dueTime" TEXT,
    "responsibleUserId" UUID,
    "createdByUserId" UUID,
    "completedByUserId" UUID,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commitments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "ownerType" "AttachmentOwnerType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "storageKey" TEXT,
    "uploadedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityHistory" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "entityType" "ActivityEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "userId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "source" VARCHAR(50),
    "targetUrl" TEXT,
    "createdBy" UUID,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "requiresReadConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "requiresAcceptance" BOOLEAN NOT NULL DEFAULT false,
    "allowsRefusal" BOOLEAN NOT NULL DEFAULT false,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "targetType" "NotificationTargetType" NOT NULL DEFAULT 'ALL',
    "targetId" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "attachmentsJson" JSONB,
    "extraJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_recipients" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "employeeId" UUID,
    "status" "NotificationStatus" NOT NULL,
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "responseJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyConsent" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "termVersion" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "address" TEXT,
    "photoBase64" TEXT,
    "pdfBase64" TEXT,

    CONSTRAINT "PrivacyConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappInstance" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "WhatsappStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "qrCode" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "whatsappJid" TEXT NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "lastMessage" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "externalId" TEXT,
    "body" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "employmentType" TEXT,
    "salaryRange" TEXT,
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "JobStatus" NOT NULL DEFAULT 'OPEN',
    "department" TEXT,
    "workMode" TEXT,
    "seniority" TEXT,
    "openings" INTEGER NOT NULL DEFAULT 1,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryHidden" BOOLEAN NOT NULL DEFAULT false,
    "deadline" TIMESTAMP(3),
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pipelineId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HiringPipeline" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HiringPipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineStage" (
    "id" UUID NOT NULL,
    "pipelineId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "position" INTEGER NOT NULL DEFAULT 0,
    "kind" "ApplicationStatus" NOT NULL DEFAULT 'SCREENING',

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobQuestion" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "position" INTEGER NOT NULL DEFAULT 0,
    "knockout" JSONB,
    "scoreRule" JSONB,

    CONSTRAINT "JobQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCriterion" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JobCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationAnswer" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ApplicationAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationEvaluation" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "criterionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitmentTag" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#7c3aed',

    CONSTRAINT "RecruitmentTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationTag" (
    "applicationId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "ApplicationTag_pkey" PRIMARY KEY ("applicationId","tagId")
);

-- CreateTable
CREATE TABLE "ApplicationEvent" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "userId" UUID,
    "type" TEXT NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationNote" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "authorName" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationInterview" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'ENTREVISTA',
    "location" TEXT,
    "interviewer" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationInterview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitmentSavedView" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecruitmentSavedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "contactId" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "linkedinUrl" TEXT,
    "coverLetter" TEXT,
    "resumeUrl" TEXT,
    "resumeName" TEXT,
    "resumeType" TEXT,
    "resumeSize" INTEGER,
    "aiScore" INTEGER,
    "aiSummary" TEXT,
    "aiNotes" TEXT,
    "aiSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastSentiment" TEXT,
    "status" "CandidateStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "source" TEXT DEFAULT 'CAREERS_PORTAL',
    "linkedinUrl" TEXT,
    "coverLetter" TEXT,
    "resumeUrl" TEXT,
    "resumeName" TEXT,
    "resumeType" TEXT,
    "resumeSize" INTEGER,
    "aiScore" INTEGER,
    "aiSummary" TEXT,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "stageId" UUID,
    "stageMovedAt" TIMESTAMP(3),
    "rating" INTEGER,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "score" INTEGER,
    "knockedOut" BOOLEAN NOT NULL DEFAULT false,
    "knockoutReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "FinancialTransactionType" NOT NULL,
    "status" "FinancialTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OvertimeBank" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "balanceMinutes" INTEGER NOT NULL DEFAULT 0,
    "accumulatedMinutes" INTEGER NOT NULL DEFAULT 0,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OvertimeBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OvertimeRule" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "weekdayRate" DECIMAL(65,30) NOT NULL DEFAULT 1.50,
    "sundayHolidayRate" DECIMAL(65,30) NOT NULL DEFAULT 2.00,
    "nightShiftRate" DECIMAL(65,30) NOT NULL DEFAULT 1.20,
    "nightShiftStart" TEXT NOT NULL DEFAULT '22:00',
    "nightShiftEnd" TEXT NOT NULL DEFAULT '05:00',
    "dsrEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OvertimeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" UUID NOT NULL,
    "companyId" UUID,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "scope" "HolidayScope" NOT NULL,
    "uf" TEXT,
    "cityCode" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaceEnrollment" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "descriptor" JSONB,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FaceEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaceClockAttempt" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID,
    "matched" BOOLEAN NOT NULL,
    "similarity" DECIMAL(65,30),
    "livenessOk" BOOLEAN,
    "imageDiscarded" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaceClockAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeClosing" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "TimeClosingStatus" NOT NULL DEFAULT 'DRAFT',
    "normalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtime50" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtime100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nightShift" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dsrValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "absences" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lateArrivals" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fallbackPunches" INTEGER NOT NULL DEFAULT 0,
    "totalPayable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salaryBase" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyDivisor" INTEGER NOT NULL DEFAULT 220,
    "payableWorkdays" INTEGER NOT NULL DEFAULT 0,
    "paidRestDays" INTEGER NOT NULL DEFAULT 0,
    "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtime50Value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtime100Value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nightShiftValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dsrHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "absenceMinutes" INTEGER NOT NULL DEFAULT 0,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "earlyLeaveMinutes" INTEGER NOT NULL DEFAULT 0,
    "absenceDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lateDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "earlyLeaveDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossPay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "inssBase" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "inssDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "irrfBase" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "irrfDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fgtsBase" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fgtsAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "calculationVersion" TEXT NOT NULL DEFAULT 'CLT_2026_1',
    "taxTableSnapshot" JSONB,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "reopenedBy" TEXT,
    "reopenReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeClosing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeClosingAdjustment" (
    "id" UUID NOT NULL,
    "timeClosingId" UUID NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeClosingAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalRolePermission" (
    "role" "UserRole" NOT NULL,
    "permissions" TEXT[],

    CONSTRAINT "GlobalRolePermission_pkey" PRIMARY KEY ("role")
);

-- CreateTable
CREATE TABLE "PlatformPlan" (
    "id" UUID NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "cycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "commitmentMonths" INTEGER NOT NULL DEFAULT 1,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "baseMonthlyPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "userMonthlyPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "asaasCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "pricingVersion" TEXT NOT NULL DEFAULT '2026.1',
    "maxUsers" INTEGER NOT NULL DEFAULT 9999,
    "maxEmployees" INTEGER NOT NULL DEFAULT 9999,
    "activeModules" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformInvoice" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "planId" UUID,
    "description" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "pricingSnapshot" JSONB,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "billingType" TEXT NOT NULL DEFAULT 'UNDEFINED',
    "asaasPaymentId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'ASAAS',
    "mpPaymentId" TEXT,
    "mpPreferenceId" TEXT,
    "invoiceUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "asaasInvoiceId" TEXT,
    "invoiceNumber" TEXT,
    "invoiceSeries" TEXT,
    "invoiceValidationCode" TEXT,
    "fiscalPdfUrl" TEXT,
    "fiscalXmlUrl" TEXT,
    "receiptUrl" TEXT,
    "nfeStatus" TEXT,
    "invoiceAuthorizedAt" TIMESTAMP(3),
    "invoiceCanceledAt" TIMESTAMP(3),
    "invoiceStatus" TEXT,

    CONSTRAINT "PlatformInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyFinanceConfig" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "internalNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notifyChargeCreated" BOOLEAN NOT NULL DEFAULT true,
    "notifyPaymentConfirmed" BOOLEAN NOT NULL DEFAULT true,
    "notifyPaymentOverdue" BOOLEAN NOT NULL DEFAULT true,
    "notifyPaymentCanceled" BOOLEAN NOT NULL DEFAULT true,
    "notifyInvoiceAuthorized" BOOLEAN NOT NULL DEFAULT true,
    "financialWhatsappPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyFinanceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceNotificationLog" (
    "id" TEXT NOT NULL,
    "companyId" UUID NOT NULL,
    "paymentId" TEXT,
    "invoiceId" TEXT,
    "eventType" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT,
    "status" TEXT NOT NULL,
    "providerId" TEXT,
    "errorMessage" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceNotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformContract" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "documentUrl" TEXT,
    "signedAt" TIMESTAMP(3),
    "contentHtml" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "proposalNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "planType" TEXT NOT NULL,
    "monthlyPrice" DOUBLE PRECISION NOT NULL,
    "usersLimit" INTEGER NOT NULL,
    "employeesLimit" INTEGER NOT NULL,
    "features" TEXT[],
    "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "termsAcceptedAt" TIMESTAMP(3),
    "termsPdfBase64" TEXT,
    "termsBucketUrl" TEXT,
    "asaasPaymentLinkId" TEXT,
    "asaasPaymentLink" TEXT,
    "asaasInvoiceId" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "signedByName" TEXT,
    "signedByEmail" TEXT,
    "signedAt" TIMESTAMP(3),
    "signatureBase64" TEXT,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalAuditLog" (
    "id" UUID NOT NULL,
    "proposalId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scaleType" TEXT NOT NULL DEFAULT '5x2',
    "status" "ScheduleStatus" NOT NULL DEFAULT 'ACTIVE',
    "entryTime" TEXT,
    "lunchStartTime" TEXT,
    "lunchReturnTime" TEXT,
    "exitTime" TEXT,
    "workDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "restDays" INTEGER[] DEFAULT ARRAY[0, 6]::INTEGER[],
    "cycleWorkHours" INTEGER,
    "cycleRestHours" INTEGER,
    "cycleStartDate" TIMESTAMP(3),
    "isNightShift" BOOLEAN NOT NULL DEFAULT false,
    "nightStartTime" TEXT,
    "nightEndTime" TEXT,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_schedules" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "scheduleId" UUID NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "entryTimeOverride" TEXT,
    "lunchStartTimeOverride" TEXT,
    "lunchReturnTimeOverride" TEXT,
    "exitTimeOverride" TEXT,
    "assignedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_exceptions" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "exceptionType" TEXT NOT NULL,
    "reason" TEXT,
    "observation" TEXT,
    "altEntryTime" TEXT,
    "altExitTime" TEXT,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_swap_requests" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "requesterId" UUID NOT NULL,
    "status" "SwapRequestStatus" NOT NULL DEFAULT 'PENDING',
    "originalDate" DATE NOT NULL,
    "targetDate" DATE NOT NULL,
    "justification" TEXT,
    "approvedByUserId" UUID,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "notifiedUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_swap_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AsaasWebhookEvent" (
    "id" TEXT NOT NULL,
    "asaasEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AsaasWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySubscription" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "planId" UUID,
    "status" TEXT NOT NULL,
    "seatQuantity" INTEGER NOT NULL DEFAULT 1,
    "pendingSeatQuantity" INTEGER,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "nextDueDate" TIMESTAMP(3),
    "trialStartedAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "pricingVersion" TEXT,
    "baseMonthlyPrice" DECIMAL(10,2),
    "userMonthlyPrice" DECIMAL(10,2),
    "discountPercent" DECIMAL(5,2),
    "asaasCustomerId" TEXT,
    "asaasSubscriptionId" TEXT,
    "couponId" UUID,
    "couponType" TEXT,
    "couponValue" DECIMAL(10,2),
    "couponCyclesLeft" INTEGER,
    "billingPaused" BOOLEAN NOT NULL DEFAULT false,
    "billingPausedAt" TIMESTAMP(3),
    "billingPausedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionCoupon" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "trialDays" INTEGER NOT NULL DEFAULT 30,
    "type" TEXT NOT NULL DEFAULT 'TRIAL_DAYS',
    "value" DECIMAL(10,2),
    "durationCycles" INTEGER,
    "allowedPlanIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minSeats" INTEGER,
    "createdBy" UUID,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "maxRedemptions" INTEGER,
    "redemptionCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromotionCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" UUID NOT NULL,
    "couponId" UUID NOT NULL,
    "companyId" UUID,
    "documentHash" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualContract" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "planId" UUID,
    "seatQuantity" INTEGER NOT NULL,
    "agreedAmount" DECIMAL(10,2) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "paymentMethod" TEXT NOT NULL,
    "externalContractNumber" TEXT,
    "notes" TEXT NOT NULL,
    "documentUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" UUID NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "companyId" UUID,
    "createdByUserId" UUID,
    "affectedUserId" UUID,
    "affectedEmployeeId" UUID,
    "assignedToUserId" UUID,
    "duplicateOfId" UUID,
    "requesterName" TEXT,
    "requesterEmail" TEXT NOT NULL,
    "requesterPhone" TEXT,
    "source" "SupportTicketSource" NOT NULL,
    "category" "SupportTicketCategory" NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'NEW',
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "affectedArea" TEXT,
    "impact" TEXT,
    "reproductionSteps" TEXT,
    "expectedResult" TEXT,
    "actualResult" TEXT,
    "pageUrl" TEXT,
    "tenantSlug" TEXT,
    "browser" TEXT,
    "operatingSystem" TEXT,
    "viewport" TEXT,
    "userAgent" TEXT,
    "appVersion" TEXT,
    "requestId" TEXT,
    "ipHash" TEXT,
    "firstResponseDueAt" TIMESTAMP(3),
    "resolutionDueAt" TIMESTAMP(3),
    "firstRespondedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "slaPausedAt" TIMESTAMP(3),
    "slaPausedMinutes" INTEGER NOT NULL DEFAULT 0,
    "slaBreached" BOOLEAN NOT NULL DEFAULT false,
    "lastCustomerReplyAt" TIMESTAMP(3),
    "lastDevReplyAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicketMessage" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "authorUserId" UUID,
    "authorName" TEXT,
    "authorEmail" TEXT,
    "visibility" "SupportMessageVisibility" NOT NULL DEFAULT 'PUBLIC',
    "message" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3),
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportAttachment" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "messageId" UUID,
    "uploadedByUserId" UUID,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "attachmentType" "SupportAttachmentType" NOT NULL,
    "declaredMimeType" TEXT NOT NULL,
    "detectedMimeType" TEXT,
    "sizeBytes" BIGINT NOT NULL,
    "sha256" TEXT NOT NULL,
    "status" "SupportAttachmentStatus" NOT NULL DEFAULT 'QUARANTINED',
    "scanProvider" TEXT,
    "scanResult" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SupportAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicketEvent" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "actorUserId" UUID,
    "eventType" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicketCounter" (
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicketCounter_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "model" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'OPENAI',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "type" "GeneratedDocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "installments" INTEGER NOT NULL DEFAULT 1,
    "amountRequested" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL,
    "returnCode" TEXT,
    "sanitizedMessage" TEXT,
    "providerId" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "referenceMonth" INTEGER NOT NULL,
    "referenceYear" INTEGER NOT NULL,
    "baseSalary" DECIMAL(12,2) NOT NULL,
    "grossSalary" DECIMAL(12,2) NOT NULL,
    "netSalary" DECIMAL(12,2) NOT NULL,
    "inssAmount" DECIMAL(12,2) NOT NULL,
    "irrfAmount" DECIMAL(12,2) NOT NULL,
    "fgtsAmount" DECIMAL(12,2) NOT NULL,
    "calculationVersion" TEXT,
    "taxTableSnapshot" JSONB,
    "overtimeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "nightShiftAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "pdfUrl" TEXT,
    "observations" TEXT,
    "approvedBy" UUID,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollItem" (
    "id" UUID NOT NULL,
    "payrollId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "type" "PayrollItemType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "isDeduction" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingFlow" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OnboardingFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingTask" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "flowId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "taskType" "OnboardingTaskType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingDocument" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "flowId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "uploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceReview" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PerformanceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceEvaluation" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "evaluatorId" UUID NOT NULL,
    "evaluateeId" UUID NOT NULL,
    "score" DECIMAL(5,2),
    "feedback" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OKR" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OKR_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Objective" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "okrId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "progress" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Objective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeyResult" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "objectiveId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "targetValue" DECIMAL(10,2) NOT NULL,
    "currentValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "progress" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeyResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "document" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "contactName" TEXT,
    "address" TEXT,
    "status" "PartnerStatus" NOT NULL DEFAULT 'ACTIVE',
    "userId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerInvoice" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PartnerInvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "attachmentUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PartnerInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeRecord" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "TimeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TimeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimePunch" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "timeRecordId" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "type" "PunchType" NOT NULL,
    "location" TEXT,
    "deviceInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimePunch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialSale" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "planId" TEXT,
    "cycle" TEXT,
    "contractValue" DECIMAL(10,2) NOT NULL,
    "recurrence" BOOLEAN NOT NULL DEFAULT false,
    "snapshot" JSONB,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "paymentReference" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionEntry" (
    "id" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "beneficiaryId" UUID NOT NULL,
    "baseValue" DECIMAL(10,2) NOT NULL,
    "percentageApplied" DECIMAL(5,2) NOT NULL,
    "commissionValue" DECIMAL(10,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "paymentReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PunchEvent" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "timeTrackId" UUID,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "workDate" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'APP',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracyMeters" DOUBLE PRECISION,
    "address" TEXT,
    "geofenceId" UUID,
    "withinFence" BOOLEAN,
    "distanceMeters" INTEGER,
    "flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "justification" TEXT,
    "deviceId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "receipt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PunchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Geofence" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL DEFAULT 150,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Geofence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimePunchPolicy" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "requireLocation" BOOLEAN NOT NULL DEFAULT true,
    "fencePolicy" TEXT NOT NULL DEFAULT 'FLAG',
    "maxAccuracyMeters" INTEGER NOT NULL DEFAULT 150,
    "minIntervalSeconds" INTEGER NOT NULL DEFAULT 60,
    "maxPunchesPerDay" INTEGER NOT NULL DEFAULT 4,
    "earlyWindowMinutes" INTEGER NOT NULL DEFAULT 120,
    "lateWindowMinutes" INTEGER NOT NULL DEFAULT 360,
    "adjustmentDeadlineDays" INTEGER NOT NULL DEFAULT 5,
    "requireJustificationOutside" BOOLEAN NOT NULL DEFAULT true,
    "maxSpeedKmh" INTEGER NOT NULL DEFAULT 250,
    "updatedByUserId" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimePunchPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleRequest" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "requesterEmployeeId" UUID NOT NULL,
    "type" "ScheduleRequestType" NOT NULL,
    "status" "ScheduleRequestStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "reason" TEXT,
    "peerEmployeeId" UUID,
    "peerAcceptedAt" TIMESTAMP(3),
    "currentStep" TEXT,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "decidedByUserId" UUID,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAuditLog" (
    "id" UUID NOT NULL,
    "seq" BIGSERIAL NOT NULL,
    "actorId" UUID,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "companyId" UUID,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "prevHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "family" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedBy" UUID,

    CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Company_document_key" ON "Company"("document");

-- CreateIndex
CREATE INDEX "Company_commercialOwnerId_idx" ON "Company"("commercialOwnerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryCredential_userId_key" ON "TemporaryCredential"("userId");

-- CreateIndex
CREATE INDEX "TemporaryCredential_expiresAt_idx" ON "TemporaryCredential"("expiresAt");

-- CreateIndex
CREATE INDEX "TemporaryCredential_revokedAt_idx" ON "TemporaryCredential"("revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CEOProfile_userId_key" ON "CEOProfile"("userId");

-- CreateIndex
CREATE INDEX "CEOContract_ceoUserId_signedAt_idx" ON "CEOContract"("ceoUserId", "signedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CEOContract_ceoUserId_version_key" ON "CEOContract"("ceoUserId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_originCandidateId_key" ON "Employee"("originCandidateId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_cpf_key" ON "Employee"("cpf");

-- CreateIndex
CREATE INDEX "Employee_companyId_idx" ON "Employee"("companyId");

-- CreateIndex
CREATE INDEX "Employee_cpf_idx" ON "Employee"("cpf");

-- CreateIndex
CREATE INDEX "TimeTrack_employeeId_idx" ON "TimeTrack"("employeeId");

-- CreateIndex
CREATE INDEX "TimeTrack_companyId_idx" ON "TimeTrack"("companyId");

-- CreateIndex
CREATE INDEX "TimeTrack_overtimeApprovalStatus_idx" ON "TimeTrack"("overtimeApprovalStatus");

-- CreateIndex
CREATE INDEX "TimeTrack_date_idx" ON "TimeTrack"("date");

-- CreateIndex
CREATE INDEX "TimeTrack_companyId_date_idx" ON "TimeTrack"("companyId", "date");

-- CreateIndex
CREATE INDEX "TimeTrack_companyId_employeeId_date_idx" ON "TimeTrack"("companyId", "employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TimeTrack_employeeId_date_key" ON "TimeTrack"("employeeId", "date");

-- CreateIndex
CREATE INDEX "WorkScheduleRule_companyId_idx" ON "WorkScheduleRule"("companyId");

-- CreateIndex
CREATE INDEX "WorkScheduleRule_status_idx" ON "WorkScheduleRule"("status");

-- CreateIndex
CREATE INDEX "TimeOccurrence_companyId_idx" ON "TimeOccurrence"("companyId");

-- CreateIndex
CREATE INDEX "TimeOccurrence_employeeId_idx" ON "TimeOccurrence"("employeeId");

-- CreateIndex
CREATE INDEX "TimeOccurrence_date_idx" ON "TimeOccurrence"("date");

-- CreateIndex
CREATE INDEX "TimeOccurrence_type_idx" ON "TimeOccurrence"("type");

-- CreateIndex
CREATE INDEX "Vacation_employeeId_idx" ON "Vacation"("employeeId");

-- CreateIndex
CREATE INDEX "Vacation_entitlementId_idx" ON "Vacation"("entitlementId");

-- CreateIndex
CREATE INDEX "VacationEntitlement_employeeId_status_concessionEnd_idx" ON "VacationEntitlement"("employeeId", "status", "concessionEnd");

-- CreateIndex
CREATE UNIQUE INDEX "VacationEntitlement_employeeId_acquisitionStart_acquisition_key" ON "VacationEntitlement"("employeeId", "acquisitionStart", "acquisitionEnd");

-- CreateIndex
CREATE INDEX "VacationPayment_vacationId_status_idx" ON "VacationPayment"("vacationId", "status");

-- CreateIndex
CREATE INDEX "VacationPayment_dueDate_status_idx" ON "VacationPayment"("dueDate", "status");

-- CreateIndex
CREATE INDEX "VacationAuditLog_vacationId_createdAt_idx" ON "VacationAuditLog"("vacationId", "createdAt");

-- CreateIndex
CREATE INDEX "VacationAuditLog_entitlementId_createdAt_idx" ON "VacationAuditLog"("entitlementId", "createdAt");

-- CreateIndex
CREATE INDEX "MedicalCertificate_companyId_employeeId_startAt_idx" ON "MedicalCertificate"("companyId", "employeeId", "startAt");

-- CreateIndex
CREATE INDEX "MedicalCertificate_companyId_status_idx" ON "MedicalCertificate"("companyId", "status");

-- CreateIndex
CREATE INDEX "PayrollTaxTable_taxType_active_effectiveFrom_effectiveTo_idx" ON "PayrollTaxTable"("taxType", "active", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollTaxTable_taxType_version_key" ON "PayrollTaxTable"("taxType", "version");

-- CreateIndex
CREATE INDEX "management_events_companyId_idx" ON "management_events"("companyId");

-- CreateIndex
CREATE INDEX "management_events_employeeId_idx" ON "management_events"("employeeId");

-- CreateIndex
CREATE INDEX "management_events_startDateTime_idx" ON "management_events"("startDateTime");

-- CreateIndex
CREATE INDEX "management_events_companyId_status_idx" ON "management_events"("companyId", "status");

-- CreateIndex
CREATE INDEX "employee_aso_records_companyId_idx" ON "employee_aso_records"("companyId");

-- CreateIndex
CREATE INDEX "employee_aso_records_employeeId_idx" ON "employee_aso_records"("employeeId");

-- CreateIndex
CREATE INDEX "employee_aso_records_asoType_idx" ON "employee_aso_records"("asoType");

-- CreateIndex
CREATE INDEX "employee_aso_records_dueDate_idx" ON "employee_aso_records"("dueDate");

-- CreateIndex
CREATE INDEX "aso_clinic_presets_companyId_idx" ON "aso_clinic_presets"("companyId");

-- CreateIndex
CREATE INDEX "commitments_companyId_idx" ON "commitments"("companyId");

-- CreateIndex
CREATE INDEX "commitments_employeeId_idx" ON "commitments"("employeeId");

-- CreateIndex
CREATE INDEX "commitments_dueDate_idx" ON "commitments"("dueDate");

-- CreateIndex
CREATE INDEX "commitments_status_idx" ON "commitments"("status");

-- CreateIndex
CREATE INDEX "Attachment_companyId_idx" ON "Attachment"("companyId");

-- CreateIndex
CREATE INDEX "Attachment_ownerType_ownerId_idx" ON "Attachment"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "ActivityHistory_companyId_idx" ON "ActivityHistory"("companyId");

-- CreateIndex
CREATE INDEX "ActivityHistory_entityType_entityId_idx" ON "ActivityHistory"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ActivityHistory_userId_idx" ON "ActivityHistory"("userId");

-- CreateIndex
CREATE INDEX "notifications_companyId_idx" ON "notifications"("companyId");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_priority_idx" ON "notifications"("priority");

-- CreateIndex
CREATE INDEX "notifications_startsAt_idx" ON "notifications"("startsAt");

-- CreateIndex
CREATE INDEX "notifications_expiresAt_idx" ON "notifications"("expiresAt");

-- CreateIndex
CREATE INDEX "notification_recipients_userId_idx" ON "notification_recipients"("userId");

-- CreateIndex
CREATE INDEX "notification_recipients_status_idx" ON "notification_recipients"("status");

-- CreateIndex
CREATE UNIQUE INDEX "notification_recipients_notificationId_userId_key" ON "notification_recipients"("notificationId", "userId");

-- CreateIndex
CREATE INDEX "PrivacyConsent_companyId_idx" ON "PrivacyConsent"("companyId");

-- CreateIndex
CREATE INDEX "PrivacyConsent_userId_idx" ON "PrivacyConsent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyConsent_userId_termVersion_key" ON "PrivacyConsent"("userId", "termVersion");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_idx" ON "AuditLog"("companyId");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_entity_idx" ON "AuditLog"("companyId", "entity");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog"("entity", "entityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappInstance_sessionId_key" ON "WhatsappInstance"("sessionId");

-- CreateIndex
CREATE INDEX "WhatsappInstance_companyId_idx" ON "WhatsappInstance"("companyId");

-- CreateIndex
CREATE INDEX "Contact_companyId_idx" ON "Contact"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_companyId_phone_key" ON "Contact"("companyId", "phone");

-- CreateIndex
CREATE INDEX "Conversation_companyId_idx" ON "Conversation"("companyId");

-- CreateIndex
CREATE INDEX "Conversation_companyId_status_idx" ON "Conversation"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_companyId_whatsappJid_key" ON "Conversation"("companyId", "whatsappJid");

-- CreateIndex
CREATE INDEX "Message_companyId_idx" ON "Message"("companyId");

-- CreateIndex
CREATE INDEX "Message_companyId_conversationId_idx" ON "Message"("companyId", "conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_companyId_externalId_key" ON "Message"("companyId", "externalId");

-- CreateIndex
CREATE INDEX "Job_companyId_idx" ON "Job"("companyId");

-- CreateIndex
CREATE INDEX "Job_companyId_status_idx" ON "Job"("companyId", "status");

-- CreateIndex
CREATE INDEX "HiringPipeline_companyId_idx" ON "HiringPipeline"("companyId");

-- CreateIndex
CREATE INDEX "PipelineStage_pipelineId_position_idx" ON "PipelineStage"("pipelineId", "position");

-- CreateIndex
CREATE INDEX "JobQuestion_jobId_position_idx" ON "JobQuestion"("jobId", "position");

-- CreateIndex
CREATE INDEX "JobCriterion_jobId_position_idx" ON "JobCriterion"("jobId", "position");

-- CreateIndex
CREATE INDEX "ApplicationAnswer_questionId_idx" ON "ApplicationAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationAnswer_applicationId_questionId_key" ON "ApplicationAnswer"("applicationId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationEvaluation_applicationId_criterionId_userId_key" ON "ApplicationEvaluation"("applicationId", "criterionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitmentTag_companyId_name_key" ON "RecruitmentTag"("companyId", "name");

-- CreateIndex
CREATE INDEX "ApplicationEvent_applicationId_createdAt_idx" ON "ApplicationEvent"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicationNote_applicationId_createdAt_idx" ON "ApplicationNote"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicationInterview_applicationId_scheduledAt_idx" ON "ApplicationInterview"("applicationId", "scheduledAt");

-- CreateIndex
CREATE INDEX "RecruitmentSavedView_companyId_userId_idx" ON "RecruitmentSavedView"("companyId", "userId");

-- CreateIndex
CREATE INDEX "Candidate_companyId_idx" ON "Candidate"("companyId");

-- CreateIndex
CREATE INDEX "Candidate_companyId_email_idx" ON "Candidate"("companyId", "email");

-- CreateIndex
CREATE INDEX "Application_companyId_idx" ON "Application"("companyId");

-- CreateIndex
CREATE INDEX "Application_companyId_jobId_stageId_idx" ON "Application"("companyId", "jobId", "stageId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_companyId_candidateId_jobId_key" ON "Application"("companyId", "candidateId", "jobId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_companyId_idx" ON "FinancialTransaction"("companyId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_companyId_type_idx" ON "FinancialTransaction"("companyId", "type");

-- CreateIndex
CREATE INDEX "FinancialTransaction_companyId_status_idx" ON "FinancialTransaction"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OvertimeBank_employeeId_key" ON "OvertimeBank"("employeeId");

-- CreateIndex
CREATE INDEX "OvertimeBank_employeeId_idx" ON "OvertimeBank"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "OvertimeBank_companyId_employeeId_key" ON "OvertimeBank"("companyId", "employeeId");

-- CreateIndex
CREATE INDEX "OvertimeRule_companyId_idx" ON "OvertimeRule"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "OvertimeRule_companyId_key" ON "OvertimeRule"("companyId");

-- CreateIndex
CREATE INDEX "Holiday_companyId_date_idx" ON "Holiday"("companyId", "date");

-- CreateIndex
CREATE INDEX "Holiday_date_idx" ON "Holiday"("date");

-- CreateIndex
CREATE UNIQUE INDEX "FaceEnrollment_employeeId_key" ON "FaceEnrollment"("employeeId");

-- CreateIndex
CREATE INDEX "FaceEnrollment_companyId_employeeId_idx" ON "FaceEnrollment"("companyId", "employeeId");

-- CreateIndex
CREATE INDEX "FaceClockAttempt_companyId_employeeId_createdAt_idx" ON "FaceClockAttempt"("companyId", "employeeId", "createdAt");

-- CreateIndex
CREATE INDEX "TimeClosing_companyId_status_periodStart_idx" ON "TimeClosing"("companyId", "status", "periodStart");

-- CreateIndex
CREATE INDEX "TimeClosing_employeeId_periodStart_idx" ON "TimeClosing"("employeeId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformPlan_code_key" ON "PlatformPlan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformInvoice_asaasPaymentId_key" ON "PlatformInvoice"("asaasPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformInvoice_mpPaymentId_key" ON "PlatformInvoice"("mpPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformInvoice_asaasInvoiceId_key" ON "PlatformInvoice"("asaasInvoiceId");

-- CreateIndex
CREATE INDEX "PlatformInvoice_companyId_status_dueDate_idx" ON "PlatformInvoice"("companyId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "PlatformInvoice_deletedAt_idx" ON "PlatformInvoice"("deletedAt");

-- CreateIndex
CREATE INDEX "PlatformInvoice_asaasInvoiceId_idx" ON "PlatformInvoice"("asaasInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyFinanceConfig_companyId_key" ON "CompanyFinanceConfig"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceNotificationLog_idempotencyKey_key" ON "FinanceNotificationLog"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FinanceNotificationLog_companyId_createdAt_idx" ON "FinanceNotificationLog"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "FinanceNotificationLog_paymentId_idx" ON "FinanceNotificationLog"("paymentId");

-- CreateIndex
CREATE INDEX "FinanceNotificationLog_invoiceId_idx" ON "FinanceNotificationLog"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformContract_companyId_key" ON "PlatformContract"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_proposalNumber_key" ON "Proposal"("proposalNumber");

-- CreateIndex
CREATE INDEX "Proposal_companyId_idx" ON "Proposal"("companyId");

-- CreateIndex
CREATE INDEX "Proposal_status_idx" ON "Proposal"("status");

-- CreateIndex
CREATE INDEX "Proposal_proposalNumber_idx" ON "Proposal"("proposalNumber");

-- CreateIndex
CREATE INDEX "ProposalAuditLog_proposalId_idx" ON "ProposalAuditLog"("proposalId");

-- CreateIndex
CREATE INDEX "ProposalAuditLog_createdAt_idx" ON "ProposalAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "schedules_companyId_idx" ON "schedules"("companyId");

-- CreateIndex
CREATE INDEX "schedules_status_idx" ON "schedules"("status");

-- CreateIndex
CREATE INDEX "user_schedules_companyId_idx" ON "user_schedules"("companyId");

-- CreateIndex
CREATE INDEX "user_schedules_employeeId_idx" ON "user_schedules"("employeeId");

-- CreateIndex
CREATE INDEX "user_schedules_scheduleId_idx" ON "user_schedules"("scheduleId");

-- CreateIndex
CREATE INDEX "user_schedules_startDate_idx" ON "user_schedules"("startDate");

-- CreateIndex
CREATE INDEX "schedule_exceptions_companyId_idx" ON "schedule_exceptions"("companyId");

-- CreateIndex
CREATE INDEX "schedule_exceptions_employeeId_idx" ON "schedule_exceptions"("employeeId");

-- CreateIndex
CREATE INDEX "schedule_exceptions_date_idx" ON "schedule_exceptions"("date");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_exceptions_employeeId_date_exceptionType_key" ON "schedule_exceptions"("employeeId", "date", "exceptionType");

-- CreateIndex
CREATE INDEX "schedule_swap_requests_companyId_idx" ON "schedule_swap_requests"("companyId");

-- CreateIndex
CREATE INDEX "schedule_swap_requests_requesterId_idx" ON "schedule_swap_requests"("requesterId");

-- CreateIndex
CREATE INDEX "schedule_swap_requests_status_idx" ON "schedule_swap_requests"("status");

-- CreateIndex
CREATE INDEX "schedule_swap_requests_originalDate_idx" ON "schedule_swap_requests"("originalDate");

-- CreateIndex
CREATE UNIQUE INDEX "AsaasWebhookEvent_asaasEventId_key" ON "AsaasWebhookEvent"("asaasEventId");

-- CreateIndex
CREATE INDEX "AsaasWebhookEvent_status_idx" ON "AsaasWebhookEvent"("status");

-- CreateIndex
CREATE INDEX "AsaasWebhookEvent_eventType_idx" ON "AsaasWebhookEvent"("eventType");

-- CreateIndex
CREATE INDEX "AsaasWebhookEvent_createdAt_idx" ON "AsaasWebhookEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySubscription_companyId_key" ON "CompanySubscription"("companyId");

-- CreateIndex
CREATE INDEX "CompanySubscription_status_idx" ON "CompanySubscription"("status");

-- CreateIndex
CREATE INDEX "CompanySubscription_nextDueDate_idx" ON "CompanySubscription"("nextDueDate");

-- CreateIndex
CREATE INDEX "CompanySubscription_trialEndsAt_idx" ON "CompanySubscription"("trialEndsAt");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionCoupon_code_key" ON "PromotionCoupon"("code");

-- CreateIndex
CREATE INDEX "PromotionCoupon_isActive_startsAt_expiresAt_idx" ON "PromotionCoupon"("isActive", "startsAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_documentHash_key" ON "CouponRedemption"("documentHash");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_idx" ON "CouponRedemption"("couponId");

-- CreateIndex
CREATE INDEX "CouponRedemption_companyId_idx" ON "CouponRedemption"("companyId");

-- CreateIndex
CREATE INDEX "ManualContract_companyId_status_idx" ON "ManualContract"("companyId", "status");

-- CreateIndex
CREATE INDEX "ManualContract_startsAt_endsAt_idx" ON "ManualContract"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "ManualContract_createdBy_idx" ON "ManualContract"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_ticketNumber_key" ON "SupportTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX "SupportTicket_companyId_status_idx" ON "SupportTicket"("companyId", "status");

-- CreateIndex
CREATE INDEX "SupportTicket_createdByUserId_idx" ON "SupportTicket"("createdByUserId");

-- CreateIndex
CREATE INDEX "SupportTicket_affectedUserId_idx" ON "SupportTicket"("affectedUserId");

-- CreateIndex
CREATE INDEX "SupportTicket_affectedEmployeeId_idx" ON "SupportTicket"("affectedEmployeeId");

-- CreateIndex
CREATE INDEX "SupportTicket_assignedToUserId_status_idx" ON "SupportTicket"("assignedToUserId", "status");

-- CreateIndex
CREATE INDEX "SupportTicket_priority_status_idx" ON "SupportTicket"("priority", "status");

-- CreateIndex
CREATE INDEX "SupportTicket_firstResponseDueAt_idx" ON "SupportTicket"("firstResponseDueAt");

-- CreateIndex
CREATE INDEX "SupportTicket_resolutionDueAt_idx" ON "SupportTicket"("resolutionDueAt");

-- CreateIndex
CREATE INDEX "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

-- CreateIndex
CREATE INDEX "SupportTicketMessage_ticketId_createdAt_idx" ON "SupportTicketMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportAttachment_storageKey_key" ON "SupportAttachment"("storageKey");

-- CreateIndex
CREATE INDEX "SupportAttachment_ticketId_idx" ON "SupportAttachment"("ticketId");

-- CreateIndex
CREATE INDEX "SupportAttachment_sha256_idx" ON "SupportAttachment"("sha256");

-- CreateIndex
CREATE INDEX "SupportAttachment_status_idx" ON "SupportAttachment"("status");

-- CreateIndex
CREATE INDEX "SupportTicketEvent_ticketId_createdAt_idx" ON "SupportTicketEvent"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_logs_tenantId_createdAt_idx" ON "ai_usage_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_logs_tenantId_feature_idx" ON "ai_usage_logs"("tenantId", "feature");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedDocument_storageKey_key" ON "GeneratedDocument"("storageKey");

-- CreateIndex
CREATE INDEX "GeneratedDocument_companyId_type_idx" ON "GeneratedDocument"("companyId", "type");

-- CreateIndex
CREATE INDEX "GeneratedDocument_createdAt_idx" ON "GeneratedDocument"("createdAt");

-- CreateIndex
CREATE INDEX "PaymentAttempt_invoiceId_idx" ON "PaymentAttempt"("invoiceId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_attemptedAt_idx" ON "PaymentAttempt"("attemptedAt");

-- CreateIndex
CREATE INDEX "Payroll_companyId_status_idx" ON "Payroll"("companyId", "status");

-- CreateIndex
CREATE INDEX "Payroll_companyId_referenceYear_referenceMonth_idx" ON "Payroll"("companyId", "referenceYear", "referenceMonth");

-- CreateIndex
CREATE INDEX "Payroll_employeeId_idx" ON "Payroll"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_companyId_employeeId_referenceMonth_referenceYear_key" ON "Payroll"("companyId", "employeeId", "referenceMonth", "referenceYear");

-- CreateIndex
CREATE INDEX "PayrollItem_payrollId_idx" ON "PayrollItem"("payrollId");

-- CreateIndex
CREATE INDEX "PayrollItem_companyId_idx" ON "PayrollItem"("companyId");

-- CreateIndex
CREATE INDEX "OnboardingFlow_companyId_status_idx" ON "OnboardingFlow"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingFlow_companyId_employeeId_key" ON "OnboardingFlow"("companyId", "employeeId");

-- CreateIndex
CREATE INDEX "OnboardingTask_flowId_idx" ON "OnboardingTask"("flowId");

-- CreateIndex
CREATE INDEX "OnboardingTask_companyId_idx" ON "OnboardingTask"("companyId");

-- CreateIndex
CREATE INDEX "OnboardingDocument_flowId_idx" ON "OnboardingDocument"("flowId");

-- CreateIndex
CREATE INDEX "OnboardingDocument_companyId_idx" ON "OnboardingDocument"("companyId");

-- CreateIndex
CREATE INDEX "PerformanceReview_companyId_status_idx" ON "PerformanceReview"("companyId", "status");

-- CreateIndex
CREATE INDEX "PerformanceEvaluation_companyId_evaluateeId_idx" ON "PerformanceEvaluation"("companyId", "evaluateeId");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceEvaluation_reviewId_evaluatorId_evaluateeId_key" ON "PerformanceEvaluation"("reviewId", "evaluatorId", "evaluateeId");

-- CreateIndex
CREATE INDEX "OKR_companyId_status_idx" ON "OKR"("companyId", "status");

-- CreateIndex
CREATE INDEX "Objective_companyId_okrId_idx" ON "Objective"("companyId", "okrId");

-- CreateIndex
CREATE INDEX "KeyResult_companyId_objectiveId_idx" ON "KeyResult"("companyId", "objectiveId");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_userId_key" ON "Partner"("userId");

-- CreateIndex
CREATE INDEX "Partner_companyId_idx" ON "Partner"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_companyId_document_key" ON "Partner"("companyId", "document");

-- CreateIndex
CREATE INDEX "PartnerInvoice_companyId_status_idx" ON "PartnerInvoice"("companyId", "status");

-- CreateIndex
CREATE INDEX "PartnerInvoice_partnerId_idx" ON "PartnerInvoice"("partnerId");

-- CreateIndex
CREATE INDEX "TimeRecord_companyId_idx" ON "TimeRecord"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeRecord_companyId_employeeId_date_key" ON "TimeRecord"("companyId", "employeeId", "date");

-- CreateIndex
CREATE INDEX "TimePunch_timeRecordId_idx" ON "TimePunch"("timeRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSale_idempotencyKey_key" ON "CommercialSale"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PunchEvent_companyId_employeeId_occurredAt_idx" ON "PunchEvent"("companyId", "employeeId", "occurredAt");

-- CreateIndex
CREATE INDEX "PunchEvent_companyId_workDate_idx" ON "PunchEvent"("companyId", "workDate");

-- CreateIndex
CREATE UNIQUE INDEX "PunchEvent_receipt_key" ON "PunchEvent"("receipt");

-- CreateIndex
CREATE INDEX "Geofence_companyId_idx" ON "Geofence"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "TimePunchPolicy_companyId_key" ON "TimePunchPolicy"("companyId");

-- CreateIndex
CREATE INDEX "ScheduleRequest_companyId_status_idx" ON "ScheduleRequest"("companyId", "status");

-- CreateIndex
CREATE INDEX "ScheduleRequest_requesterEmployeeId_idx" ON "ScheduleRequest"("requesterEmployeeId");

-- CreateIndex
CREATE INDEX "ScheduleRequest_peerEmployeeId_idx" ON "ScheduleRequest"("peerEmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAuditLog_seq_key" ON "PlatformAuditLog"("seq");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_createdAt_idx" ON "PlatformAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_entity_entityId_idx" ON "PlatformAuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_actorId_idx" ON "PlatformAuditLog"("actorId");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_companyId_idx" ON "PlatformAuditLog"("companyId");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_action_idx" ON "PlatformAuditLog"("action");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshSession_tokenHash_key" ON "RefreshSession"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshSession_userId_revokedAt_idx" ON "RefreshSession"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "RefreshSession_family_idx" ON "RefreshSession"("family");

-- CreateIndex
CREATE INDEX "RefreshSession_expiresAt_idx" ON "RefreshSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_commercialOwnerId_fkey" FOREIGN KEY ("commercialOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_platformPlanId_fkey" FOREIGN KEY ("platformPlanId") REFERENCES "PlatformPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryCredential" ADD CONSTRAINT "TemporaryCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CEOProfile" ADD CONSTRAINT "CEOProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CEOContract" ADD CONSTRAINT "CEOContract_ceoUserId_fkey" FOREIGN KEY ("ceoUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CEOContract" ADD CONSTRAINT "CEOContract_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_originCandidateId_fkey" FOREIGN KEY ("originCandidateId") REFERENCES "Candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_workScheduleRuleId_fkey" FOREIGN KEY ("workScheduleRuleId") REFERENCES "WorkScheduleRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeTrack" ADD CONSTRAINT "TimeTrack_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeTrack" ADD CONSTRAINT "TimeTrack_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeTrack" ADD CONSTRAINT "TimeTrack_overtimeApprovedByUserId_fkey" FOREIGN KEY ("overtimeApprovedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkScheduleRule" ADD CONSTRAINT "WorkScheduleRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeOccurrence" ADD CONSTRAINT "TimeOccurrence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeOccurrence" ADD CONSTRAINT "TimeOccurrence_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacation" ADD CONSTRAINT "Vacation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacation" ADD CONSTRAINT "Vacation_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "VacationEntitlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacationEntitlement" ADD CONSTRAINT "VacationEntitlement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacationPayment" ADD CONSTRAINT "VacationPayment_vacationId_fkey" FOREIGN KEY ("vacationId") REFERENCES "Vacation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacationAuditLog" ADD CONSTRAINT "VacationAuditLog_vacationId_fkey" FOREIGN KEY ("vacationId") REFERENCES "Vacation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacationAuditLog" ADD CONSTRAINT "VacationAuditLog_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "VacationEntitlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalCertificate" ADD CONSTRAINT "MedicalCertificate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalCertificate" ADD CONSTRAINT "MedicalCertificate_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "management_events" ADD CONSTRAINT "management_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "management_events" ADD CONSTRAINT "management_events_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_aso_records" ADD CONSTRAINT "employee_aso_records_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_aso_records" ADD CONSTRAINT "employee_aso_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_aso_records" ADD CONSTRAINT "employee_aso_records_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_aso_records" ADD CONSTRAINT "employee_aso_records_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_aso_records" ADD CONSTRAINT "employee_aso_records_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aso_clinic_presets" ADD CONSTRAINT "aso_clinic_presets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityHistory" ADD CONSTRAINT "ActivityHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityHistory" ADD CONSTRAINT "ActivityHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyConsent" ADD CONSTRAINT "PrivacyConsent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyConsent" ADD CONSTRAINT "PrivacyConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappInstance" ADD CONSTRAINT "WhatsappInstance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "HiringPipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiringPipeline" ADD CONSTRAINT "HiringPipeline_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "HiringPipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobQuestion" ADD CONSTRAINT "JobQuestion_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCriterion" ADD CONSTRAINT "JobCriterion_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAnswer" ADD CONSTRAINT "ApplicationAnswer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAnswer" ADD CONSTRAINT "ApplicationAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "JobQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvaluation" ADD CONSTRAINT "ApplicationEvaluation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvaluation" ADD CONSTRAINT "ApplicationEvaluation_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "JobCriterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentTag" ADD CONSTRAINT "RecruitmentTag_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationTag" ADD CONSTRAINT "ApplicationTag_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationTag" ADD CONSTRAINT "ApplicationTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "RecruitmentTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvent" ADD CONSTRAINT "ApplicationEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationNote" ADD CONSTRAINT "ApplicationNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationInterview" ADD CONSTRAINT "ApplicationInterview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentSavedView" ADD CONSTRAINT "RecruitmentSavedView_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvertimeBank" ADD CONSTRAINT "OvertimeBank_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvertimeBank" ADD CONSTRAINT "OvertimeBank_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvertimeRule" ADD CONSTRAINT "OvertimeRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceEnrollment" ADD CONSTRAINT "FaceEnrollment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceEnrollment" ADD CONSTRAINT "FaceEnrollment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeClosing" ADD CONSTRAINT "TimeClosing_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeClosing" ADD CONSTRAINT "TimeClosing_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeClosingAdjustment" ADD CONSTRAINT "TimeClosingAdjustment_timeClosingId_fkey" FOREIGN KEY ("timeClosingId") REFERENCES "TimeClosing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformInvoice" ADD CONSTRAINT "PlatformInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformInvoice" ADD CONSTRAINT "PlatformInvoice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlatformPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyFinanceConfig" ADD CONSTRAINT "CompanyFinanceConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceNotificationLog" ADD CONSTRAINT "FinanceNotificationLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformContract" ADD CONSTRAINT "PlatformContract_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalAuditLog" ADD CONSTRAINT "ProposalAuditLog_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_schedules" ADD CONSTRAINT "user_schedules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_schedules" ADD CONSTRAINT "user_schedules_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_schedules" ADD CONSTRAINT "user_schedules_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_swap_requests" ADD CONSTRAINT "schedule_swap_requests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_swap_requests" ADD CONSTRAINT "schedule_swap_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySubscription" ADD CONSTRAINT "CompanySubscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySubscription" ADD CONSTRAINT "CompanySubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlatformPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "PromotionCoupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualContract" ADD CONSTRAINT "ManualContract_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualContract" ADD CONSTRAINT "ManualContract_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlatformPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_affectedUserId_fkey" FOREIGN KEY ("affectedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_affectedEmployeeId_fkey" FOREIGN KEY ("affectedEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "SupportTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAttachment" ADD CONSTRAINT "SupportAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAttachment" ADD CONSTRAINT "SupportAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "SupportTicketMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAttachment" ADD CONSTRAINT "SupportAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketEvent" ADD CONSTRAINT "SupportTicketEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketEvent" ADD CONSTRAINT "SupportTicketEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PlatformInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "OnboardingFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingDocument" ADD CONSTRAINT "OnboardingDocument_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "OnboardingFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceEvaluation" ADD CONSTRAINT "PerformanceEvaluation_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "PerformanceReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceEvaluation" ADD CONSTRAINT "PerformanceEvaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceEvaluation" ADD CONSTRAINT "PerformanceEvaluation_evaluateeId_fkey" FOREIGN KEY ("evaluateeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_okrId_fkey" FOREIGN KEY ("okrId") REFERENCES "OKR"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyResult" ADD CONSTRAINT "KeyResult_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerInvoice" ADD CONSTRAINT "PartnerInvoice_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerInvoice" ADD CONSTRAINT "PartnerInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeRecord" ADD CONSTRAINT "TimeRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeRecord" ADD CONSTRAINT "TimeRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimePunch" ADD CONSTRAINT "TimePunch_timeRecordId_fkey" FOREIGN KEY ("timeRecordId") REFERENCES "TimeRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimePunch" ADD CONSTRAINT "TimePunch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialSale" ADD CONSTRAINT "CommercialSale_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialSale" ADD CONSTRAINT "CommercialSale_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialSale" ADD CONSTRAINT "CommercialSale_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "CommercialSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchEvent" ADD CONSTRAINT "PunchEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchEvent" ADD CONSTRAINT "PunchEvent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Geofence" ADD CONSTRAINT "Geofence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimePunchPolicy" ADD CONSTRAINT "TimePunchPolicy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleRequest" ADD CONSTRAINT "ScheduleRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleRequest" ADD CONSTRAINT "ScheduleRequest_requesterEmployeeId_fkey" FOREIGN KEY ("requesterEmployeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleRequest" ADD CONSTRAINT "ScheduleRequest_peerEmployeeId_fkey" FOREIGN KEY ("peerEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshSession" ADD CONSTRAINT "RefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

const { z } = require("zod");

const conditionLevelEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

const createPatientSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  contact: z.string().trim().optional(),
  description: z.string().trim().optional(),
  conditionLevel: conditionLevelEnum.default("LOW"),
  doctorId: z.string().trim().optional().nullable(),
});

const updatePatientSchema = createPatientSchema.partial();

const collectFeeSchema = z.object({
  patientId: z.string().min(1, "patientId is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  method: z.enum(["CASH", "CARD", "QR"]).default("CASH"),
  description: z.string().trim().optional(),
});

module.exports = { createPatientSchema, updatePatientSchema, collectFeeSchema, conditionLevelEnum };

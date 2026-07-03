const { z } = require("zod");

const updateConsultationSchema = z.object({
  cause: z.string().trim().optional(),
  condition: z.string().trim().optional(),
  disease: z.string().trim().optional(),
  symptoms: z.string().trim().optional(),
  patientDescription: z.string().trim().optional(),
  additionalNote: z.string().trim().optional(),
});

const addPrescriptionItemSchema = z.object({
  patientId: z.string().trim().min(1, "patientId is required"),
  medicine: z.string().trim().min(1, "Medicine name is required"),
  dosage: z.string().trim().optional(),
  frequency: z.string().trim().optional(),
  duration: z.string().trim().optional(),
  instructions: z.string().trim().optional(),
});

const updatePatientByDoctorSchema = z.object({
  name: z.string().trim().min(2).optional(),
  contact: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

const analyseSchema = z.object({
  symptoms: z.string().trim().default(""),
  disease: z.string().trim().default(""),
  cause: z.string().trim().default(""),
  condition: z.string().trim().default(""),
  patientDescription: z.string().trim().default(""),
});

module.exports = {
  updateConsultationSchema,
  addPrescriptionItemSchema,
  updatePatientByDoctorSchema,
  analyseSchema,
};

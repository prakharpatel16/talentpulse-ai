const { z } = require('zod');

const createJobSchema = z.object({
  companyId: z.string().optional(),
  title: z.string().min(3, 'Job title must be at least 3 characters'),
  department: z.string().optional(),
  description: z.string().min(10, 'Job description must be at least 10 characters'),
  responsibilities: z.array(z.string()).default([]),
  requiredSkills: z.array(z.string()).min(1, 'At least one required skill is required'),
  preferredSkills: z.array(z.string()).default([]),
  experience: z.object({
    min: z.number().nonnegative().default(0),
    max: z.number().nonnegative().default(5)
  }).default({ min: 0, max: 5 }),
  location: z.string().default('Remote'),
  employmentType: z.enum(['full-time', 'part-time', 'contract', 'internship']).default('full-time'),
  salaryRange: z.object({
    min: z.number().nonnegative().default(0),
    max: z.number().nonnegative().default(0),
    currency: z.string().default('USD')
  }).default({ min: 0, max: 0, currency: 'USD' }),
  status: z.enum(['draft', 'published', 'closed']).default('published')
});

const updateJobSchema = createJobSchema.partial();

module.exports = {
  createJobSchema,
  updateJobSchema
};

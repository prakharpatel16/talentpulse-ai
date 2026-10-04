const { z } = require('zod');

const applyJobSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  resumeId: z.string().min(1, 'Resume ID is required'),
  coverLetter: z.string().optional().default('')
});

const updateStatusSchema = z.object({
  status: z.enum(['applied', 'under_review', 'shortlisted', 'interview', 'selected', 'rejected'])
});

module.exports = {
  applyJobSchema,
  updateStatusSchema
};

const { z } = require('zod');

const companySchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  description: z.string().optional(),
  website: z.string().url('Invalid URL format').optional().or(z.literal('')),
  location: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  logo: z.string().optional()
});

module.exports = {
  companySchema
};

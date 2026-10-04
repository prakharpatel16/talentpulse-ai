const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['candidate', 'recruiter']).default('candidate'),
  phone: z.string().optional(),
  location: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  title: z.string().optional(),
  profile: z.object({
    bio: z.string().optional(),
    skills: z.array(z.string()).optional(),
    education: z.array(z.object({
      institution: z.string(),
      degree: z.string(),
      field: z.string().optional(),
      startYear: z.number().optional(),
      endYear: z.number().optional()
    })).optional(),
    experience: z.array(z.object({
      company: z.string(),
      position: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      description: z.string().optional()
    })).optional(),
    projects: z.array(z.object({
      name: z.string(),
      description: z.string().optional(),
      technologies: z.array(z.string()).optional(),
      url: z.string().optional()
    })).optional()
  }).optional()
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters')
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema
};

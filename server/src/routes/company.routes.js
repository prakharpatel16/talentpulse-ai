const express = require('express');
const router = express.Router();
const companyController = require('../controllers/company.controller');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validation.middleware');
const upload = require('../middleware/upload.middleware');
const { companySchema } = require('../validators/company.validator');

router.post('/', authMiddleware, requireRole('recruiter'), validate(companySchema), asyncHandler(companyController.createCompany));
router.get('/me', authMiddleware, requireRole('recruiter'), asyncHandler(companyController.getCompany));
router.get('/:id', authMiddleware, asyncHandler(companyController.getCompany));
router.patch('/:id', authMiddleware, requireRole('recruiter'), validate(companySchema.partial()), asyncHandler(companyController.updateCompany));
router.post('/:id/logo', authMiddleware, requireRole('recruiter'), upload.single('logo'), asyncHandler(companyController.uploadLogo));

module.exports = router;

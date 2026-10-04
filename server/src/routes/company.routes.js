const express = require('express');
const router = express.Router();
const companyController = require('../controllers/company.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validation.middleware');
const upload = require('../middleware/upload.middleware');
const { companySchema } = require('../validators/company.validator');

router.post('/', authMiddleware, requireRole('recruiter'), validate(companySchema), companyController.createCompany);
router.get('/me', authMiddleware, requireRole('recruiter'), companyController.getCompany);
router.get('/:id', authMiddleware, companyController.getCompany);
router.patch('/:id', authMiddleware, requireRole('recruiter'), validate(companySchema.partial()), companyController.updateCompany);
router.post('/:id/logo', authMiddleware, requireRole('recruiter'), upload.single('logo'), companyController.uploadLogo);

module.exports = router;

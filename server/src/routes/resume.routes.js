const express = require("express");
const router = express.Router();
const resumeController = require("../controllers/resume.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const upload = require("../middleware/upload.middleware");

router.post(
  "/",
  authMiddleware,
  requireRole("candidate"),
  upload.single("resume"),
  resumeController.uploadResume,
);
router.get(
  "/me",
  authMiddleware,
  requireRole("candidate"),
  resumeController.getMyResumes,
);
router.get("/:id/file", authMiddleware, resumeController.downloadResume);
router.get("/:id", authMiddleware, resumeController.getResumeById);
router.delete(
  "/:id",
  authMiddleware,
  requireRole("candidate"),
  resumeController.deleteResume,
);
router.patch(
  "/:id/primary",
  authMiddleware,
  requireRole("candidate"),
  resumeController.setPrimaryResume,
);

module.exports = router;

const express = require("express");
const router = express.Router();
const resumeController = require("../controllers/resume.controller");
const asyncHandler = require("../middleware/asyncHandler");
const { authMiddleware } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const upload = require("../middleware/upload.middleware");

router.post(
  "/",
  authMiddleware,
  requireRole("candidate"),
  upload.single("resume"),
  asyncHandler(resumeController.uploadResume),
);
router.get(
  "/me",
  authMiddleware,
  requireRole("candidate"),
  asyncHandler(resumeController.getMyResumes),
);
router.get("/:id/file", authMiddleware, asyncHandler(resumeController.downloadResume));
router.get("/:id", authMiddleware, asyncHandler(resumeController.getResumeById));
router.delete(
  "/:id",
  authMiddleware,
  requireRole("candidate"),
  asyncHandler(resumeController.deleteResume),
);
router.patch(
  "/:id/primary",
  authMiddleware,
  requireRole("candidate"),
  asyncHandler(resumeController.setPrimaryResume),
);

module.exports = router;

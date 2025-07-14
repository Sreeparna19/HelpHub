const express = require('express');
const { body } = require('express-validator');
const {
  getDashboardStats,
  getUsers,
  getUser,
  updateUserStatus,
  getRequests,
  flagRequest,
  deleteRequest,
  getFlaggedContent,
  getLeaderboard,
  getAnalytics
} = require('../controllers/adminController');

const router = express.Router();

// Validation middleware
const updateUserStatusValidation = [
  body('isBlocked')
    .optional()
    .isBoolean()
    .withMessage('isBlocked must be a boolean'),
  body('isVerified')
    .optional()
    .isBoolean()
    .withMessage('isVerified must be a boolean'),
  body('role')
    .optional()
    .isIn(['needy', 'volunteer', 'admin'])
    .withMessage('Invalid role')
];

const flagRequestValidation = [
  body('isFlagged')
    .isBoolean()
    .withMessage('isFlagged must be a boolean'),
  body('flagReason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Flag reason cannot exceed 500 characters')
];

// Dashboard routes
router.get('/dashboard', getDashboardStats);
router.get('/analytics', getAnalytics);
router.get('/leaderboard', getLeaderboard);

// User management routes
router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.put('/users/:id/status', updateUserStatusValidation, updateUserStatus);

// Request management routes
router.get('/requests', getRequests);
router.put('/requests/:id/flag', flagRequestValidation, flagRequest);
router.delete('/requests/:id', deleteRequest);

// Content moderation routes
router.get('/flagged', getFlaggedContent);

module.exports = router;
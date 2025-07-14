const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');

// Import controllers
const {
  createRequest,
  getRequests,
  getRequest,
  updateRequest,
  deleteRequest,
  acceptRequest,
  updateStatus,
  applyForRequest,
  uploadImages,
  rateVolunteer,
  getVolunteerStats,
  getVolunteerRequests
} = require('../controllers/requestController');

// Import middleware
const { verifyToken } = require('../middleware/verifyToken');
const { roleCheck } = require('../middleware/roleCheck');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/requests/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Validation middleware
const validateRequest = [
  body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters'),
  body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
  body('category').isIn(['Food', 'Medical', 'Shelter', 'Education', 'Transportation', 'Other']).withMessage('Invalid category'),
  body('urgency').isIn(['Low', 'Medium', 'High']).withMessage('Invalid urgency level'),
  body('location').custom((value, { req }) => {
    // Allow both object and string formats
    if (typeof value === 'string') {
      // Convert string to object format
      req.body.location = {
        address: value,
        coordinates: [0, 0], // Default coordinates
        city: '',
        state: '',
        zipCode: ''
      };
      return true;
    }
    if (typeof value === 'object' && value !== null) {
      if (!value.address) {
        throw new Error('Location address is required');
      }
      if (!value.coordinates || !Array.isArray(value.coordinates) || value.coordinates.length !== 2) {
        // Set default coordinates if not provided
        value.coordinates = [0, 0];
      }
      return true;
    }
    throw new Error('Location must be a string or object');
  }),
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude')
];

const validateStatusUpdate = [
  body('status').isIn(['Pending', 'Accepted', 'On the Way', 'Completed', 'Cancelled']).withMessage('Invalid status'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters')
];

const validateRating = [
  body('rating').isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 500 }).withMessage('Comment must be less than 500 characters')
];

// Apply validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Routes

// Create a new help request (needy users only)
router.post('/', 
  verifyToken, 
  roleCheck(['needy']), 
  validateRequest, 
  handleValidationErrors, 
  createRequest
);

// Get all requests with filters
router.get('/', verifyToken, getRequests);

// Get volunteer statistics
router.get('/volunteer-stats', verifyToken, roleCheck(['volunteer']), getVolunteerStats);

// Get volunteer's accepted requests
router.get('/volunteer-requests', verifyToken, roleCheck(['volunteer']), getVolunteerRequests);

// Get a specific request
router.get('/:id', verifyToken, getRequest);

// Update a request (owner only)
router.put('/:id', 
  verifyToken, 
  validateRequest, 
  handleValidationErrors, 
  updateRequest
);

// Delete a request (owner only)
router.delete('/:id', verifyToken, deleteRequest);

// Accept a request (volunteers only)
router.post('/:id/accept', 
  verifyToken, 
  roleCheck(['volunteer']), 
  acceptRequest
);

// Update request status
router.put('/:id/status', 
  verifyToken, 
  validateStatusUpdate, 
  handleValidationErrors, 
  updateStatus
);

// Apply for a request (volunteers only)
router.post('/:id/apply', 
  verifyToken, 
  roleCheck(['volunteer']), 
  body('message').optional().trim().isLength({ max: 500 }).withMessage('Message must be less than 500 characters'),
  handleValidationErrors,
  applyForRequest
);

// Upload images for a request
router.post('/:id/images', 
  verifyToken, 
  upload.array('images', 5), // Max 5 images
  uploadImages
);

// Rate a volunteer (needy users only)
router.post('/:id/rate', 
  verifyToken, 
  roleCheck(['needy']), 
  validateRating, 
  handleValidationErrors, 
  rateVolunteer
);

// Error handling for file uploads
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'File too large. Maximum size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        status: 'error',
        message: 'Too many files. Maximum is 5 images.'
      });
    }
  }
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({
      status: 'error',
      message: 'Only image files are allowed!'
    });
  }
  next(error);
});

module.exports = router;
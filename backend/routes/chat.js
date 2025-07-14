const express = require('express');
const { body } = require('express-validator');
const multer = require('multer');
const path = require('path');
const {
  getChats,
  getChatMessages,
  sendMessage,
  uploadChatImage,
  updateTypingStatus,
  markAsRead,
  deleteMessage
} = require('../controllers/chatController');
const { isNeedyOrVolunteer } = require('../middleware/roleCheck');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Validation middleware
const sendMessageValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'document', 'location'])
    .withMessage('Invalid message type'),
  body('replyTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid reply message ID')
];

const updateTypingValidation = [
  body('isTyping')
    .isBoolean()
    .withMessage('isTyping must be a boolean')
];

// Routes
router.get('/', isNeedyOrVolunteer, getChats);
router.get('/:chatId', isNeedyOrVolunteer, getChatMessages);
router.post('/:chatId/messages', isNeedyOrVolunteer, sendMessageValidation, sendMessage);
router.post('/:chatId/images', isNeedyOrVolunteer, upload.single('image'), uploadChatImage);
router.post('/:chatId/typing', isNeedyOrVolunteer, updateTypingValidation, updateTypingStatus);
router.put('/:chatId/read', isNeedyOrVolunteer, markAsRead);
router.delete('/:chatId/messages/:messageId', isNeedyOrVolunteer, deleteMessage);

module.exports = router;
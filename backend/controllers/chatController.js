const Chat = require('../models/Chat');
const HelpRequest = require('../models/HelpRequest');
const User = require('../models/User');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// @desc    Get user's chats
// @route   GET /api/chat
// @access  Private
exports.getChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user.id
    })
    .populate('participants', 'name avatar')
    .populate('helpRequest', 'title category status')
    .sort({ lastActivity: -1 });

    const chatSummaries = chats.map(chat => ({
      ...chat.getChatSummary(),
      unreadCount: chat.getUnreadCount(req.user.id)
    }));

    res.status(200).json({
      status: 'success',
      data: chatSummaries
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get chats'
    });
  }
};

// @desc    Get chat messages
// @route   GET /api/chat/:chatId
// @access  Private
exports.getChatMessages = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const chat = await Chat.findById(req.params.chatId)
      .populate('participants', 'name avatar')
      .populate('helpRequest', 'title category status')
      .populate('messages.sender', 'name avatar');

    if (!chat) {
      return res.status(404).json({
        status: 'error',
        message: 'Chat not found'
      });
    }

    // Check if user is participant
    if (!chat.participants.find(p => p._id.toString() === req.user.id)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Mark messages as read
    await chat.markAsRead(req.user.id);

    // Paginate messages
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const messages = chat.messages.slice(startIndex, endIndex).reverse();

    res.status(200).json({
      status: 'success',
      data: {
        chat: chat.getChatSummary(),
        messages,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(chat.messages.length / limit),
          hasMore: endIndex < chat.messages.length
        }
      }
    });
  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get chat messages'
    });
  }
};

// @desc    Send message
// @route   POST /api/chat/:chatId/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    console.log('Send message request:', {
      body: req.body,
      params: req.params,
      user: req.user
    });
    
    const { content, messageType = 'text', replyTo } = req.body;
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        status: 'error',
        message: 'Chat not found'
      });
    }

    // Check if user is participant
    if (!chat.participants.find(p => p.toString() === req.user.id)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Check if chat is active
    if (!chat.isActive) {
      return res.status(400).json({
        status: 'error',
        message: 'Chat is not active'
      });
    }

    const messageData = {
      sender: req.user.id,
      content,
      messageType,
      replyTo
    };

    const message = chat.addMessage(messageData);
    await chat.save();

    // Get sender info for the message
    const sender = await User.findById(messageData.sender).select('name avatar');
    const populatedMessage = {
      ...message,
      sender: sender
    };

    // Emit socket event
    const io = req.app.get('io');
    chat.participants.forEach(participantId => {
      if (participantId.toString() !== req.user.id) {
        io.to(participantId.toString()).emit('receive_message', {
          chatId: chat._id,
          message: populatedMessage
        });
      }
    });

    res.status(201).json({
      status: 'success',
      data: populatedMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send message'
    });
  }
};

// @desc    Upload chat image
// @route   POST /api/chat/:chatId/images
// @access  Private
exports.uploadChatImage = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        status: 'error',
        message: 'Chat not found'
      });
    }

    if (!chat.participants.find(p => p.toString() === req.user.id)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Please upload an image'
      });
    }

    // Upload to cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'helphub/chat',
      width: 800,
      crop: 'scale'
    });

    const messageData = {
      sender: req.user.id,
      content: 'Image',
      messageType: 'image',
      attachments: [{
        public_id: result.public_id,
        url: result.secure_url,
        type: 'image'
      }]
    };

    const message = chat.addMessage(messageData);
    await chat.save();

    // Get sender info for the message
    const sender = await User.findById(messageData.sender).select('name avatar');
    const populatedMessage = {
      ...message,
      sender: sender
    };

    // Emit socket event
    const io = req.app.get('io');
    chat.participants.forEach(participantId => {
      if (participantId.toString() !== req.user.id) {
        io.to(participantId.toString()).emit('receive_message', {
          chatId: chat._id,
          message: populatedMessage
        });
      }
    });

    res.status(201).json({
      status: 'success',
      data: populatedMessage
    });
  } catch (error) {
    console.error('Upload chat image error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload image'
    });
  }
};

// @desc    Update typing status
// @route   POST /api/chat/:chatId/typing
// @access  Private
exports.updateTypingStatus = async (req, res) => {
  try {
    const { isTyping } = req.body;
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        status: 'error',
        message: 'Chat not found'
      });
    }

    if (!chat.participants.find(p => p.toString() === req.user.id)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    chat.updateTypingStatus(req.user.id, isTyping);
    await chat.save();

    // Emit socket event
    const io = req.app.get('io');
    chat.participants.forEach(participantId => {
      if (participantId.toString() !== req.user.id) {
        io.to(participantId.toString()).emit('user_typing', {
          chatId: chat._id,
          userId: req.user.id,
          isTyping
        });
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Typing status updated'
    });
  } catch (error) {
    console.error('Update typing status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update typing status'
    });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/chat/:chatId/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        status: 'error',
        message: 'Chat not found'
      });
    }

    if (!chat.participants.find(p => p.toString() === req.user.id)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    await chat.markAsRead(req.user.id);

    res.status(200).json({
      status: 'success',
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark messages as read'
    });
  }
};

// @desc    Delete message
// @route   DELETE /api/chat/:chatId/messages/:messageId
// @access  Private
exports.deleteMessage = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        status: 'error',
        message: 'Chat not found'
      });
    }

    if (!chat.participants.find(p => p.toString() === req.user.id)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    const message = chat.messages.id(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found'
      });
    }

    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Can only delete your own messages'
      });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    await chat.save();

    res.status(200).json({
      status: 'success',
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete message'
    });
  }
};
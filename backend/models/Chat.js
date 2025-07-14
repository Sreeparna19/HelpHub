const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'document', 'location'],
    default: 'text'
  },
  attachments: [{
    public_id: String,
    url: String,
    name: String,
    type: String
  }],
  location: {
    coordinates: [Number],
    address: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }
}, {
  timestamps: true
});

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  helpRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HelpRequest',
    required: true
  },
  messages: [messageSchema],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: new Map()
  },
  typingUsers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isTyping: {
      type: Boolean,
      default: false
    },
    lastTyping: Date
  }],
  settings: {
    notifications: {
      type: Boolean,
      default: true
    },
    sound: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
chatSchema.index({ participants: 1 });
chatSchema.index({ helpRequest: 1 });
chatSchema.index({ lastActivity: -1 });

// Method to add message to chat
chatSchema.methods.addMessage = function(messageData) {
  // Create a new message object directly
  const message = {
    ...messageData,
    _id: new mongoose.Types.ObjectId(),
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  this.messages.push(message);
  this.lastMessage = message._id;
  this.lastActivity = new Date();
  
  // Update unread count for other participants
  this.participants.forEach(participantId => {
    if (participantId.toString() !== messageData.sender.toString()) {
      const currentCount = this.unreadCount.get(participantId.toString()) || 0;
      this.unreadCount.set(participantId.toString(), currentCount + 1);
    }
  });
  
  return message;
};

// Method to mark messages as read
chatSchema.methods.markAsRead = function(userId) {
  this.messages.forEach(message => {
    if (message.sender.toString() !== userId.toString() && !message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
    }
  });
  
  this.unreadCount.set(userId.toString(), 0);
  return this.save();
};

// Method to get unread count for a user
chatSchema.methods.getUnreadCount = function(userId) {
  return this.unreadCount.get(userId.toString()) || 0;
};

// Method to update typing status
chatSchema.methods.updateTypingStatus = function(userId, isTyping) {
  const existingIndex = this.typingUsers.findIndex(
    user => user.userId.toString() === userId.toString()
  );
  
  if (existingIndex !== -1) {
    this.typingUsers[existingIndex].isTyping = isTyping;
    this.typingUsers[existingIndex].lastTyping = new Date();
  } else {
    this.typingUsers.push({
      userId,
      isTyping,
      lastTyping: new Date()
    });
  }
  
  // Remove typing status after 5 seconds
  if (!isTyping) {
    setTimeout(() => {
      const index = this.typingUsers.findIndex(
        user => user.userId.toString() === userId.toString()
      );
      if (index !== -1) {
        this.typingUsers.splice(index, 1);
        this.save();
      }
    }, 5000);
  }
};

// Method to get chat summary
chatSchema.methods.getChatSummary = function() {
  return {
    _id: this._id,
    participants: this.participants,
    helpRequest: this.helpRequest,
    lastMessage: this.lastMessage,
    lastActivity: this.lastActivity,
    isActive: this.isActive,
    messageCount: this.messages.length,
    createdAt: this.createdAt
  };
};

// Static method to find or create chat
chatSchema.statics.findOrCreateChat = async function(participants, helpRequestId) {
  let chat = await this.findOne({
    participants: { $all: participants },
    helpRequest: helpRequestId
  });
  
  if (!chat) {
    chat = new this({
      participants,
      helpRequest: helpRequestId,
      unreadCount: new Map()
    });
    await chat.save();
  }
  
  return chat;
};

module.exports = mongoose.model('Chat', chatSchema);
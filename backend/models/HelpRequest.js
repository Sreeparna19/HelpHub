const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const helpRequestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Food', 'Medical', 'Shelter', 'Education', 'Transportation', 'Other']
  },
  urgency: {
    type: String,
    required: [true, 'Urgency level is required'],
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'On the Way', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    },
    address: {
      type: String,
      required: true
    },
    city: String,
    state: String,
    zipCode: String
  },
  images: [{
    public_id: String,
    url: String
  }],
  documents: [{
    public_id: String,
    url: String,
    name: String
  }],
  needyUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  volunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acceptedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  estimatedCompletionTime: Date,
  actualCompletionTime: Date,
  isUrgent: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isFlagged: {
    type: Boolean,
    default: false
  },
  flagReason: String,
  tags: [String],
  priority: {
    type: Number,
    default: 0 // Higher number = higher priority
  },
  views: {
    type: Number,
    default: 0
  },
  applications: [{
    volunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected'],
      default: 'Pending'
    }
  }],
  chatRoom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    maxlength: [500, 'Review cannot exceed 500 characters']
  },
  reviewSubmittedAt: Date
}, {
  timestamps: true
});

// Add pagination plugin
helpRequestSchema.plugin(mongoosePaginate);

// Index for geospatial queries
// helpRequestSchema.index({ location: '2dsphere' });

// Index for status and category queries
helpRequestSchema.index({ status: 1, category: 1 });
helpRequestSchema.index({ needyUser: 1, status: 1 });
helpRequestSchema.index({ volunteer: 1, status: 1 });

// Virtual for time since creation
helpRequestSchema.virtual('timeSinceCreation').get(function() {
  return Date.now() - this.createdAt;
});

// Virtual for isExpired (requests older than 7 days)
helpRequestSchema.virtual('isExpired').get(function() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return this.createdAt < sevenDaysAgo && this.status === 'Pending';
});

// Method to calculate priority score
helpRequestSchema.methods.calculatePriority = function() {
  let priority = 0;
  
  // Urgency weight
  switch (this.urgency) {
    case 'High':
      priority += 30;
      break;
    case 'Medium':
      priority += 20;
      break;
    case 'Low':
      priority += 10;
      break;
  }
  
  // Time factor (newer requests get higher priority)
  const hoursSinceCreation = (Date.now() - this.createdAt) / (1000 * 60 * 60);
  if (hoursSinceCreation < 1) priority += 25;
  else if (hoursSinceCreation < 6) priority += 20;
  else if (hoursSinceCreation < 24) priority += 15;
  else if (hoursSinceCreation < 72) priority += 10;
  
  // Category weight
  switch (this.category) {
    case 'Medical':
      priority += 20;
      break;
    case 'Shelter':
      priority += 15;
      break;
    case 'Food':
      priority += 10;
      break;
    default:
      priority += 5;
  }
  
  return priority;
};

// Pre-save middleware to update priority
helpRequestSchema.pre('save', function(next) {
  this.priority = this.calculatePriority();
  next();
});

// Method to get public request data (without sensitive info)
helpRequestSchema.methods.getPublicData = function() {
  return {
    _id: this._id,
    title: this.title,
    description: this.description,
    category: this.category,
    urgency: this.urgency,
    status: this.status,
    location: this.location,
    images: this.images,
    isUrgent: this.isUrgent,
    isVerified: this.isVerified,
    tags: this.tags,
    priority: this.priority,
    views: this.views,
    applicationsCount: this.applications.length,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    timeSinceCreation: this.timeSinceCreation,
    isExpired: this.isExpired
  };
};

// Add pagination plugin
helpRequestSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('HelpRequest', helpRequestSchema);
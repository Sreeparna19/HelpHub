const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  helpRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HelpRequest',
    required: true
  },
  rater: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rated: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  review: {
    type: String,
    trim: true,
    maxlength: [500, 'Review cannot exceed 500 characters']
  },
  categories: [{
    category: {
      type: String,
      enum: ['Punctuality', 'Communication', 'Helpfulness', 'Professionalism', 'Overall']
    },
    score: {
      type: Number,
      min: 1,
      max: 5
    }
  }],
  isAnonymous: {
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
  helpfulCount: {
    type: Number,
    default: 0
  },
  helpfulUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  response: {
    content: String,
    respondedAt: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
ratingSchema.index({ rated: 1, createdAt: -1 });
ratingSchema.index({ helpRequest: 1 });
ratingSchema.index({ rater: 1, rated: 1 }, { unique: true });

// Pre-save middleware to ensure one rating per request per user
ratingSchema.pre('save', async function(next) {
  if (this.isNew) {
    const existingRating = await this.constructor.findOne({
      helpRequest: this.helpRequest,
      rater: this.rater,
      rated: this.rated
    });
    
    if (existingRating) {
      throw new Error('You have already rated this user for this request');
    }
  }
  next();
});

// Method to calculate average rating for a user
ratingSchema.statics.getAverageRating = async function(userId) {
  const result = await this.aggregate([
    { $match: { rated: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ]);
  
  if (result.length === 0) {
    return {
      averageRating: 0,
      totalRatings: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }
  
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  result[0].ratingDistribution.forEach(rating => {
    ratingDistribution[rating]++;
  });
  
  return {
    averageRating: Math.round(result[0].averageRating * 10) / 10,
    totalRatings: result[0].totalRatings,
    ratingDistribution
  };
};

// Method to get rating summary for a user
ratingSchema.statics.getRatingSummary = async function(userId) {
  const ratings = await this.find({ rated: userId })
    .populate('rater', 'name avatar')
    .populate('helpRequest', 'title category')
    .sort({ createdAt: -1 })
    .limit(10);
  
  const averageData = await this.getAverageRating(userId);
  
  return {
    recentRatings: ratings,
    averageRating: averageData.averageRating,
    totalRatings: averageData.totalRatings,
    ratingDistribution: averageData.ratingDistribution
  };
};

// Method to mark review as helpful
ratingSchema.methods.markHelpful = async function(userId) {
  if (this.helpfulUsers.includes(userId)) {
    // Remove helpful mark
    this.helpfulUsers = this.helpfulUsers.filter(id => id.toString() !== userId.toString());
    this.helpfulCount = Math.max(0, this.helpfulCount - 1);
  } else {
    // Add helpful mark
    this.helpfulUsers.push(userId);
    this.helpfulCount += 1;
  }
  
  await this.save();
  return this.helpfulCount;
};

// Method to add response to review
ratingSchema.methods.addResponse = async function(content) {
  this.response = {
    content,
    respondedAt: new Date()
  };
  
  await this.save();
  return this.response;
};

// Method to get public rating data
ratingSchema.methods.getPublicData = function() {
  return {
    _id: this._id,
    rating: this.rating,
    review: this.review,
    categories: this.categories,
    isAnonymous: this.isAnonymous,
    helpfulCount: this.helpfulCount,
    response: this.response,
    createdAt: this.createdAt,
    rater: this.isAnonymous ? null : this.rater,
    helpRequest: this.helpRequest
  };
};

module.exports = mongoose.model('Rating', ratingSchema);
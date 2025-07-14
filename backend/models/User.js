const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['needy', 'volunteer', 'admin'],
    default: 'needy'
  },
  avatar: {
    public_id: String,
    url: {
      type: String,
      default: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'
    }
  },
  idProof: {
    public_id: String,
    url: String,
    verified: {
      type: Boolean,
      default: false
    }
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: undefined
    },
    address: {
      type: String,
      default: 'Not specified'
    },
    city: {
      type: String
    },
    state: {
      type: String
    },
    zipCode: {
      type: String
    }
  },
  serviceArea: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: {
      type: [Number]
    },
    radius: {
      type: Number,
      default: 10 // km
    }
  },
  preferences: {
    categories: [{
      type: String,
      enum: ['Food', 'Medical', 'Shelter', 'Education', 'Transportation', 'Other']
    }],
    maxDistance: {
      type: Number,
      default: 10 // km
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    }
  },
  stats: {
    requestsCreated: {
      type: Number,
      default: 0
    },
    requestsCompleted: {
      type: Number,
      default: 0
    },
    totalRating: {
      type: Number,
      default: 0
    },
    ratingCount: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    },
    points: {
      type: Number,
      default: 0
    },
    badges: [{
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Hero', 'Verified']
    }]
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  firebaseUid: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerificationToken: String,
  emailVerificationExpire: Date
}, {
  timestamps: true
});

// Geo Indexes (enable if needed)
// userSchema.index({ location: '2dsphere' });
// userSchema.index({ serviceArea: '2dsphere' });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();  // Ensure exit if password is not modified
  }
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Calculate average rating
userSchema.methods.calculateAverageRating = function () {
  if (this.stats.ratingCount === 0) return 0;
  return this.stats.totalRating / this.stats.ratingCount;
};

// Add points method
userSchema.methods.addPoints = function (points) {
  this.stats.points += points;

  // Award badges based on points
  if (this.stats.points >= 1000 && !this.stats.badges.includes('Hero')) {
    this.stats.badges.push('Hero');
  } else if (this.stats.points >= 500 && !this.stats.badges.includes('Gold')) {
    this.stats.badges.push('Gold');
  } else if (this.stats.points >= 100 && !this.stats.badges.includes('Silver')) {
    this.stats.badges.push('Silver');
  } else if (this.stats.points >= 10 && !this.stats.badges.includes('Bronze')) {
    this.stats.badges.push('Bronze');
  }
};

// Get public profile
userSchema.methods.getPublicProfile = function () {
  return {
    _id: this._id,
    name: this.name,
    avatar: this.avatar,
    role: this.role,
    location: this.location,
    stats: {
      requestsCompleted: this.stats.requestsCompleted,
      averageRating: this.calculateAverageRating(),
      points: this.stats.points,
      badges: this.stats.badges
    },
    isVerified: this.isVerified,
    lastActive: this.lastActive
  };
};

module.exports = mongoose.model('User', userSchema);

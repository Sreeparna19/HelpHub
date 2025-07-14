const User = require('../models/User');
const HelpRequest = require('../models/HelpRequest');
const Rating = require('../models/Rating');
const Chat = require('../models/Chat');
const { sendEmail } = require('../utils/notification');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
exports.getDashboardStats = async (req, res) => {
  try {
    // Get basic stats
    const totalUsers = await User.countDocuments();
    const totalRequests = await HelpRequest.countDocuments();
    const totalVolunteers = await User.countDocuments({ role: 'volunteer' });
    const totalNeedyUsers = await User.countDocuments({ role: 'needy' });

    // Get request stats by status
    const requestStats = await HelpRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get user stats by role
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent activity
    const recentRequests = await HelpRequest.find()
      .populate('needyUser', 'name')
      .populate('volunteer', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    const recentUsers = await User.find()
      .select('name email role createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get monthly stats for the last 6 months
    const monthlyStats = await HelpRequest.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          totalUsers,
          totalRequests,
          totalVolunteers,
          totalNeedyUsers
        },
        requestStats: requestStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        userStats: userStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        recentActivity: {
          requests: recentRequests,
          users: recentUsers
        },
        monthlyStats
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get dashboard stats'
    });
  }
};

// @desc    Get all users with pagination and filters
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      isVerified,
      isBlocked,
      search
    } = req.query;

    const query = {};

    if (role) query.role = role;
    if (isVerified !== undefined) query.isVerified = isVerified === 'true';
    if (isBlocked !== undefined) query.isBlocked = isBlocked === 'true';

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const users = await User.paginate(query, options);

    res.status(200).json({
      status: 'success',
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get users'
    });
  }
};

// @desc    Get user details
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Get user's requests
    const requests = await HelpRequest.find({
      $or: [
        { needyUser: user._id },
        { volunteer: user._id }
      ]
    })
    .populate('needyUser', 'name')
    .populate('volunteer', 'name')
    .sort({ createdAt: -1 })
    .limit(10);

    // Get user's ratings if volunteer
    let ratings = [];
    if (user.role === 'volunteer') {
      ratings = await Rating.find({ rated: user._id })
        .populate('rater', 'name')
        .populate('helpRequest', 'title')
        .sort({ createdAt: -1 })
        .limit(10);
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
        requests,
        ratings
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user details'
    });
  }
};

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin)
exports.updateUserStatus = async (req, res) => {
  try {
    const { isBlocked, isVerified, role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const updates = {};
    if (isBlocked !== undefined) updates.isBlocked = isBlocked;
    if (isVerified !== undefined) updates.isVerified = isVerified;
    if (role) updates.role = role;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    // Send notification email
    try {
      if (isBlocked) {
        await sendEmail({
          email: user.email,
          subject: 'Account Status Update',
          message: `Hi ${user.name}, your account has been blocked due to policy violations. Please contact support for more information.`
        });
      } else if (isVerified) {
        await sendEmail({
          email: user.email,
          subject: 'Account Verified',
          message: `Hi ${user.name}, your account has been verified! You now have access to additional features.`
        });
      }
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    res.status(200).json({
      status: 'success',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update user status'
    });
  }
};

// @desc    Get all help requests with filters
// @route   GET /api/admin/requests
// @access  Private (Admin)
exports.getRequests = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      isFlagged,
      search
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (isFlagged !== undefined) query.isFlagged = isFlagged === 'true';

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'needyUser', select: 'name email' },
        { path: 'volunteer', select: 'name email' }
      ]
    };

    const requests = await HelpRequest.paginate(query, options);

    res.status(200).json({
      status: 'success',
      data: requests
    });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get requests'
    });
  }
};

// @desc    Flag/Unflag request
// @route   PUT /api/admin/requests/:id/flag
// @access  Private (Admin)
exports.flagRequest = async (req, res) => {
  try {
    const { isFlagged, flagReason } = req.body;
    const request = await HelpRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        status: 'error',
        message: 'Request not found'
      });
    }

    request.isFlagged = isFlagged;
    if (flagReason) request.flagReason = flagReason;

    await request.save();

    res.status(200).json({
      status: 'success',
      data: request
    });
  } catch (error) {
    console.error('Flag request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to flag request'
    });
  }
};

// @desc    Delete request
// @route   DELETE /api/admin/requests/:id
// @access  Private (Admin)
exports.deleteRequest = async (req, res) => {
  try {
    const request = await HelpRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        status: 'error',
        message: 'Request not found'
      });
    }

    // Delete associated chat
    if (request.chatRoom) {
      await Chat.findByIdAndDelete(request.chatRoom);
    }

    // Delete associated ratings
    await Rating.deleteMany({ helpRequest: request._id });

    await request.remove();

    res.status(200).json({
      status: 'success',
      message: 'Request deleted successfully'
    });
  } catch (error) {
    console.error('Delete request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete request'
    });
  }
};

// @desc    Get flagged content
// @route   GET /api/admin/flagged
// @access  Private (Admin)
exports.getFlaggedContent = async (req, res) => {
  try {
    const flaggedRequests = await HelpRequest.find({ isFlagged: true })
      .populate('needyUser', 'name email')
      .populate('volunteer', 'name email')
      .sort({ createdAt: -1 });

    const flaggedRatings = await Rating.find({ isFlagged: true })
      .populate('rater', 'name email')
      .populate('rated', 'name email')
      .populate('helpRequest', 'title')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: {
        requests: flaggedRequests,
        ratings: flaggedRatings
      }
    });
  } catch (error) {
    console.error('Get flagged content error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get flagged content'
    });
  }
};

// @desc    Get leaderboard
// @route   GET /api/admin/leaderboard
// @access  Private (Admin)
exports.getLeaderboard = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFilter = {};
    if (period === 'week') {
      dateFilter = { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
    } else if (period === 'month') {
      dateFilter = { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
    }

    const leaderboard = await User.aggregate([
      { $match: { role: 'volunteer' } },
      {
        $lookup: {
          from: 'helprequests',
          localField: '_id',
          foreignField: 'volunteer',
          as: 'completedRequests'
        }
      },
      {
        $addFields: {
          completedCount: {
            $size: {
              $filter: {
                input: '$completedRequests',
                cond: { $eq: ['$$this.status', 'Completed'] }
              }
            }
          }
        }
      },
      {
        $sort: { 'stats.points': -1, completedCount: -1 }
      },
      {
        $limit: 20
      },
      {
        $project: {
          name: 1,
          email: 1,
          avatar: 1,
          'stats.points': 1,
          'stats.badges': 1,
          completedCount: 1,
          averageRating: '$stats.averageRating'
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: leaderboard
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get leaderboard'
    });
  }
};

// @desc    Get system analytics
// @route   GET /api/admin/analytics
// @access  Private (Admin)
exports.getAnalytics = async (req, res) => {
  try {
    // User growth over time
    const userGrowth = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Request completion rate
    const requestStats = await HelpRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Category distribution
    const categoryStats = await HelpRequest.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    // Average response time
    const responseTimeStats = await HelpRequest.aggregate([
      {
        $match: {
          acceptedAt: { $exists: true },
          createdAt: { $exists: true }
        }
      },
      {
        $addFields: {
          responseTime: {
            $divide: [
              { $subtract: ['$acceptedAt', '$createdAt'] },
              1000 * 60 // Convert to minutes
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$responseTime' },
          minResponseTime: { $min: '$responseTime' },
          maxResponseTime: { $max: '$responseTime' }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        userGrowth,
        requestStats,
        categoryStats,
        responseTimeStats: responseTimeStats[0] || {}
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get analytics'
    });
  }
};
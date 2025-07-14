const HelpRequest = require('../models/HelpRequest');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Rating = require('../models/Rating');
const { validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;
const { sendEmail, sendSMS } = require('../utils/notification');
const { getDistance } = require('geolib');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// @desc    Create help request
// @route   POST /api/requests
// @access  Private (Needy users)
exports.createRequest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }

    const {
      title,
      description,
      category,
      urgency,
      location,
      estimatedCompletionTime
    } = req.body;

    console.log('Received location:', location);
    console.log('Location type:', typeof location);
    console.log('Full request body:', req.body);

    // Create help request
    const helpRequest = await HelpRequest.create({
      title,
      description,
      category,
      urgency,
      location,
      estimatedCompletionTime,
      needyUser: req.user.id,
      isUrgent: urgency === 'High'
    });

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'stats.requestsCreated': 1 }
    });

    // Populate needy user info
    await helpRequest.populate('needyUser', 'name avatar location');

    res.status(201).json({
      status: 'success',
      data: helpRequest
    });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create help request'
    });
  }
};

// @desc    Get all help requests (with filters)
// @route   GET /api/requests
// @access  Private
exports.getRequests = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      urgency,
      status,
      distance,
      lat,
      lng,
      sort = '-createdAt'
    } = req.query;

    const query = {};

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by urgency
    if (urgency) {
      query.urgency = urgency;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by distance if coordinates provided
    if (lat && lng && distance) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseFloat(distance) * 1000 // Convert km to meters
        }
      };
    }

    // For volunteers, only show pending requests
    if (req.user.role === 'volunteer') {
      query.status = 'Pending';
    }

    // For needy users, show their own requests
    if (req.user.role === 'needy') {
      query.needyUser = req.user.id;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      populate: [
        { path: 'needyUser', select: 'name avatar location' },
        { path: 'volunteer', select: 'name avatar location stats' }
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
      message: 'Failed to get help requests'
    });
  }
};

// @desc    Get single help request
// @route   GET /api/requests/:id
// @access  Private
exports.getRequest = async (req, res) => {
  try {
    const helpRequest = await HelpRequest.findById(req.params.id)
      .populate('needyUser', 'name avatar location phone')
      .populate('volunteer', 'name avatar location phone stats')
      .populate('applications.volunteer', 'name avatar location stats')
      .populate('chatRoom', '_id');

    if (!helpRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Help request not found'
      });
    }

    // Check if user has access to this request
    if (req.user.role === 'needy' && helpRequest.needyUser._id.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Increment views
    helpRequest.views += 1;
    await helpRequest.save();

    res.status(200).json({
      status: 'success',
      data: helpRequest
    });
  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get help request'
    });
  }
};

// @desc    Update help request
// @route   PUT /api/requests/:id
// @access  Private (Needy users - own requests)
exports.updateRequest = async (req, res) => {
  try {
    let helpRequest = await HelpRequest.findById(req.params.id);

    if (!helpRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Help request not found'
      });
    }

    // Check ownership
    if (helpRequest.needyUser.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Only allow updates if request is pending
    if (helpRequest.status !== 'Pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot update request that is not pending'
      });
    }

    const fieldsToUpdate = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      urgency: req.body.urgency,
      location: req.body.location,
      estimatedCompletionTime: req.body.estimatedCompletionTime
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => 
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    helpRequest = await HelpRequest.findByIdAndUpdate(
      req.params.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    ).populate('needyUser', 'name avatar location');

    res.status(200).json({
      status: 'success',
      data: helpRequest
    });
  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update help request'
    });
  }
};

// @desc    Delete help request
// @route   DELETE /api/requests/:id
// @access  Private (Needy users - own requests)
exports.deleteRequest = async (req, res) => {
  try {
    const helpRequest = await HelpRequest.findById(req.params.id);

    if (!helpRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Help request not found'
      });
    }

    // Check ownership
    if (helpRequest.needyUser.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Only allow deletion if request is pending
    if (helpRequest.status !== 'Pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete request that is not pending'
      });
    }

    await helpRequest.remove();

    res.status(200).json({
      status: 'success',
      message: 'Help request deleted successfully'
    });
  } catch (error) {
    console.error('Delete request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete help request'
    });
  }
};

// @desc    Accept help request (Volunteer)
// @route   POST /api/requests/:id/accept
// @access  Private (Volunteers)
exports.acceptRequest = async (req, res) => {
  try {
    const helpRequest = await HelpRequest.findById(req.params.id);

    if (!helpRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Help request not found'
      });
    }

    if (helpRequest.status !== 'Pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Request is not available for acceptance'
      });
    }

    // Update request
    helpRequest.volunteer = req.user.id;
    helpRequest.status = 'Accepted';
    helpRequest.acceptedAt = new Date();
    await helpRequest.save();

    // Create chat room
    const chat = await Chat.findOrCreateChat(
      [helpRequest.needyUser, req.user.id],
      helpRequest._id
    );

    helpRequest.chatRoom = chat._id;
    await helpRequest.save();

    // Populate data
    await helpRequest.populate('needyUser', 'name email phone');
    await helpRequest.populate('volunteer', 'name email phone');

    // Send notifications
    try {
      await sendEmail({
        email: helpRequest.needyUser.email,
        subject: 'Your help request has been accepted!',
        message: `Hi ${helpRequest.needyUser.name}, your help request "${helpRequest.title}" has been accepted by ${helpRequest.volunteer.name}. You can now chat with them through the platform.`
      });

      if (helpRequest.needyUser.phone) {
        await sendSMS({
          to: helpRequest.needyUser.phone,
          message: `Your help request "${helpRequest.title}" has been accepted! Check your email for details.`
        });
      }
    } catch (notificationError) {
      console.error('Notification error:', notificationError);
    }

    res.status(200).json({
      status: 'success',
      data: helpRequest
    });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to accept help request'
    });
  }
};

// @desc    Update request status
// @route   PUT /api/requests/:id/status
// @access  Private (Volunteers - accepted requests)
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const helpRequest = await HelpRequest.findById(req.params.id);

    if (!helpRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Help request not found'
      });
    }

    // Check if user is the volunteer
    if (helpRequest.volunteer.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Update status
    helpRequest.status = status;
    
    if (status === 'On the Way') {
      helpRequest.estimatedCompletionTime = req.body.estimatedCompletionTime;
    } else if (status === 'Completed') {
      helpRequest.completedAt = new Date();
      helpRequest.actualCompletionTime = new Date();
      
      // Award points to volunteer
      const volunteer = await User.findById(req.user.id);
      const points = helpRequest.urgency === 'High' ? 50 : 
                    helpRequest.urgency === 'Medium' ? 30 : 20;
      volunteer.addPoints(points);
      volunteer.stats.requestsCompleted += 1;
      await volunteer.save();
    }

    await helpRequest.save();

    // Populate data
    await helpRequest.populate('needyUser', 'name email phone');
    await helpRequest.populate('volunteer', 'name email phone');

    // Send notifications
    try {
      await sendEmail({
        email: helpRequest.needyUser.email,
        subject: `Help request status updated: ${status}`,
        message: `Hi ${helpRequest.needyUser.name}, your help request "${helpRequest.title}" status has been updated to "${status}".`
      });
    } catch (notificationError) {
      console.error('Notification error:', notificationError);
    }

    res.status(200).json({
      status: 'success',
      data: helpRequest
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update request status'
    });
  }
};

// @desc    Apply for help request
// @route   POST /api/requests/:id/apply
// @access  Private (Volunteers)
exports.applyForRequest = async (req, res) => {
  try {
    const { message } = req.body;
    const helpRequest = await HelpRequest.findById(req.params.id);

    if (!helpRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Help request not found'
      });
    }

    if (helpRequest.status !== 'Pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Request is not available for applications'
      });
    }

    // Check if already applied
    const alreadyApplied = helpRequest.applications.find(
      app => app.volunteer.toString() === req.user.id
    );

    if (alreadyApplied) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already applied for this request'
      });
    }

    // Add application
    helpRequest.applications.push({
      volunteer: req.user.id,
      message
    });

    await helpRequest.save();

    res.status(200).json({
      status: 'success',
      message: 'Application submitted successfully'
    });
  } catch (error) {
    console.error('Apply for request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to apply for help request'
    });
  }
};

// @desc    Upload request images
// @route   POST /api/requests/:id/images
// @access  Private (Needy users - own requests)
exports.uploadImages = async (req, res) => {
  try {
    const helpRequest = await HelpRequest.findById(req.params.id);

    if (!helpRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Help request not found'
      });
    }

    if (helpRequest.needyUser.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Please upload at least one image'
      });
    }

    const uploadPromises = req.files.map(async (file) => {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'helphub/requests',
        width: 800,
        crop: 'scale'
      });
      return {
        public_id: result.public_id,
        url: result.secure_url
      };
    });

    const uploadedImages = await Promise.all(uploadPromises);
    helpRequest.images.push(...uploadedImages);
    await helpRequest.save();

    res.status(200).json({
      status: 'success',
      data: helpRequest.images
    });
  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload images'
    });
  }
};

// @desc    Rate volunteer
// @route   POST /api/requests/:id/rate
// @access  Private (Needy users - completed requests)
exports.rateVolunteer = async (req, res) => {
  try {
    const { rating, review, categories } = req.body;
    const helpRequest = await HelpRequest.findById(req.params.id);

    if (!helpRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Help request not found'
      });
    }

    // Check if user is the needy user
    if (helpRequest.needyUser.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Check if request is completed
    if (helpRequest.status !== 'Completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Can only rate completed requests'
      });
    }

    // Check if already rated
    const existingRating = await Rating.findOne({
      helpRequest: helpRequest._id,
      rater: req.user.id
    });

    if (existingRating) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already rated this volunteer'
      });
    }

    // Create rating
    const newRating = await Rating.create({
      helpRequest: helpRequest._id,
      rater: req.user.id,
      rated: helpRequest.volunteer,
      rating,
      review,
      categories
    });

    // Update volunteer's average rating
    const volunteer = await User.findById(helpRequest.volunteer);
    const volunteerRatings = await Rating.find({ rated: helpRequest.volunteer });
    const averageRating = volunteerRatings.reduce((acc, r) => acc + r.rating, 0) / volunteerRatings.length;
    
    volunteer.stats.averageRating = averageRating;
    await volunteer.save();

    // Populate rating data
    await newRating.populate('rater', 'name avatar');
    await newRating.populate('rated', 'name avatar');

    res.status(201).json({
      status: 'success',
      data: newRating
    });
  } catch (error) {
    console.error('Rate volunteer error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to rate volunteer'
    });
  }
};

// @desc    Get volunteer statistics
// @route   GET /api/requests/volunteer-stats
// @access  Private (Volunteers)
exports.getVolunteerStats = async (req, res) => {
  try {
    const volunteerId = req.user.id;

    // Get volunteer's requests
    const acceptedRequests = await HelpRequest.countDocuments({
      volunteer: volunteerId,
      status: { $in: ['Accepted', 'On the Way', 'Completed'] }
    });

    const completedRequests = await HelpRequest.countDocuments({
      volunteer: volunteerId,
      status: 'Completed'
    });

    const totalRequests = await HelpRequest.countDocuments({
      volunteer: volunteerId
    });

    // Get average rating
    const ratings = await Rating.find({ rated: volunteerId });
    const averageRating = ratings.length > 0 
      ? ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length 
      : 0;

    res.status(200).json({
      status: 'success',
      data: {
        totalRequests,
        acceptedRequests,
        completedRequests,
        averageRating
      }
    });
  } catch (error) {
    console.error('Get volunteer stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get volunteer statistics'
    });
  }
};

// @desc    Get volunteer's accepted requests
// @route   GET /api/requests/volunteer-requests
// @access  Private (Volunteers)
exports.getVolunteerRequests = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sort = '-updatedAt'
    } = req.query;

    const query = {
      volunteer: req.user.id
    };

    // Filter by status if provided
    if (status) {
      if (Array.isArray(status)) {
        query.status = { $in: status };
      } else {
        query.status = status;
      }
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      populate: [
        { path: 'needyUser', select: 'name avatar location phone' },
        { path: 'chatRoom', select: '_id' }
      ]
    };

    const requests = await HelpRequest.paginate(query, options);

    res.status(200).json({
      status: 'success',
      data: requests
    });
  } catch (error) {
    console.error('Get volunteer requests error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get volunteer requests'
    });
  }
};
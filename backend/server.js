const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

// Load environment variables
dotenv.config({ path: './config.env' });

// Import routes
const authRoutes = require('./routes/auth');
const requestRoutes = require('./routes/request');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');

// Import middleware
const { verifyToken } = require('./middleware/verifyToken');
const { roleCheck } = require('./middleware/roleCheck');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Rate limiting - More lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // More lenient in development
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.'
  }
});

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // 5 attempts per 15 minutes in production, 50 in development
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  message: {
    status: 'error',
    message: 'Too many login attempts, please try again later.'
  }
});

// Apply general rate limiting
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/helphub', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user to their room
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  // Handle chat messages
  socket.on('send_message', (data) => {
    // Emit to all participants in the chat except sender
    const chatId = data.chatId;
    io.to(chatId).emit('receive_message', {
      chatId: chatId,
      message: data
    });
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const chatId = data.chatId;
    socket.to(chatId).emit('user_typing', {
      chatId: chatId,
      userId: data.sender,
      isTyping: data.isTyping
    });
  });

  // Handle request status updates
  socket.on('request_update', (data) => {
    io.to(data.userId).emit('request_status_changed', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/requests', verifyToken, requestRoutes);
app.use('/api/chat', verifyToken, chatRoutes);
app.use('/api/admin', verifyToken, roleCheck(['admin']), adminRoutes);

// Validation error handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid JSON format'
    });
  }
  
  if (err.array) {
    // Validation error from express-validator
    const errors = err.array().map(error => error.msg);
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors
    });
  }
  
  next(err);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'HelpHub API is running',
    timestamp: new Date().toISOString()
  });
});

// Development endpoint to reset rate limiting (remove in production)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/reset-rate-limit', (req, res) => {
    // This will reset the rate limiting for the current IP
    res.status(200).json({ 
      status: 'success', 
      message: 'Rate limit reset for development',
      timestamp: new Date().toISOString()
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    status: 'error', 
    message: 'Something went wrong!' 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    status: 'error', 
    message: 'Route not found' 
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`HelpHub server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
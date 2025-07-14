const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Configure Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send email
const sendEmail = async ({ email, subject, message, html }) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      text: message,
      html: html || message
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

// Send SMS
const sendSMS = async ({ to, message }) => {
  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    console.log('SMS sent:', result.sid);
    return result;
  } catch (error) {
    console.error('SMS sending failed:', error);
    throw error;
  }
};

// Send welcome email
const sendWelcomeEmail = async (user) => {
  const subject = 'Welcome to HelpHub!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Welcome to HelpHub!</h2>
      <p>Hi ${user.name},</p>
      <p>Thank you for joining HelpHub! We're excited to have you as part of our community.</p>
      <p>Here's what you can do:</p>
      <ul>
        <li>Create help requests if you need assistance</li>
        <li>Volunteer to help others in need</li>
        <li>Connect with volunteers and needy users</li>
        <li>Build a supportive community</li>
      </ul>
      <p>If you have any questions, feel free to reach out to our support team.</p>
      <p>Best regards,<br>The HelpHub Team</p>
    </div>
  `;

  return sendEmail({
    email: user.email,
    subject,
    html
  });
};

// Send request accepted notification
const sendRequestAcceptedEmail = async (request, volunteer) => {
  const subject = 'Your help request has been accepted!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669;">Great news!</h2>
      <p>Hi ${request.needyUser.name},</p>
      <p>Your help request "<strong>${request.title}</strong>" has been accepted by ${volunteer.name}.</p>
      <p>You can now:</p>
      <ul>
        <li>Chat with ${volunteer.name} through the platform</li>
        <li>Track the progress of your request</li>
        <li>Get updates on when they'll arrive</li>
      </ul>
      <p>Please log in to your account to start chatting.</p>
      <p>Best regards,<br>The HelpHub Team</p>
    </div>
  `;

  return sendEmail({
    email: request.needyUser.email,
    subject,
    html
  });
};

// Send status update notification
const sendStatusUpdateEmail = async (request, status) => {
  const subject = `Help request status updated: ${status}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Status Update</h2>
      <p>Hi ${request.needyUser.name},</p>
      <p>Your help request "<strong>${request.title}</strong>" status has been updated to <strong>${status}</strong>.</p>
      <p>Please log in to your account for more details.</p>
      <p>Best regards,<br>The HelpHub Team</p>
    </div>
  `;

  return sendEmail({
    email: request.needyUser.email,
    subject,
    html
  });
};

// Send volunteer verification email
const sendVerificationEmail = async (user) => {
  const subject = 'Your account has been verified!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669;">Account Verified!</h2>
      <p>Hi ${user.name},</p>
      <p>Congratulations! Your account has been verified by our team.</p>
      <p>You now have access to:</p>
      <ul>
        <li>Verified badge on your profile</li>
        <li>Priority in help request matching</li>
        <li>Enhanced trust from other users</li>
      </ul>
      <p>Thank you for helping build a trustworthy community!</p>
      <p>Best regards,<br>The HelpHub Team</p>
    </div>
  `;

  return sendEmail({
    email: user.email,
    subject,
    html
  });
};

// Send password reset email
const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  const subject = 'Password Reset Request';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Password Reset</h2>
      <p>Hi ${user.name},</p>
      <p>You requested a password reset for your HelpHub account.</p>
      <p>Click the button below to reset your password:</p>
      <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p>${resetUrl}</p>
      <p>This link will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>The HelpHub Team</p>
    </div>
  `;

  return sendEmail({
    email: user.email,
    subject,
    html
  });
};

// Send new message notification
const sendNewMessageEmail = async (recipient, sender, chatId) => {
  const subject = `New message from ${sender.name}`;
  const chatUrl = `${process.env.FRONTEND_URL}/chat/${chatId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">New Message</h2>
      <p>Hi ${recipient.name},</p>
      <p>You have received a new message from ${sender.name}.</p>
      <a href="${chatUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Message</a>
      <p>Best regards,<br>The HelpHub Team</p>
    </div>
  `;

  return sendEmail({
    email: recipient.email,
    subject,
    html
  });
};

module.exports = {
  sendEmail,
  sendSMS,
  sendWelcomeEmail,
  sendRequestAcceptedEmail,
  sendStatusUpdateEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendNewMessageEmail
};
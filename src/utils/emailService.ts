import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendVerificationEmail = async (email: string, token: string) => {
  const verificationLink = `${process.env.API_URL}/api/v1/auth/verify-email?token=${token}`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@hafiproperties.com',
      to: email,
      subject: 'Verify Your Airbnb Account',
      html: `
        <h2>Welcome to Airbnb!</h2>
        <p>Please verify your email by clicking the link below:</p>
        <a href="${verificationLink}">Verify Email</a>
        <p>This link expires in 1 hour.</p>
      `,
    });
  } catch (error) {
    console.error('Email send error:', error);
    throw new Error('Failed to send verification email');
  }
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetLink = `${process.env.API_URL}/api/v1/auth/reset-password?token=${token}`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@hafiproperties.com',
      to: email,
      subject: 'Reset Your HafiProprties Password',
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>This link expires in 30 minutes.</p>
      `,
    });
  } catch (error) {
    console.error('Email send error:', error);
    throw new Error('Failed to send password reset email');
  }
};

export const sendBookingConfirmation = async (email: string, bookingId: string, guestName: string) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@hafiproperties.com',
      to: email,
      subject: `Booking Confirmation - Reference #${bookingId}`,
      html: `
        <h2>Your Booking is Confirmed!</h2>
        <p>Hi ${guestName},</p>
        <p>Your booking has been confirmed. Reference number: <strong>${bookingId}</strong></p>
        <p>You can view your booking details in your account.</p>
      `,
    });
  } catch (error) {
    console.error('Email send error:', error);
  }
};

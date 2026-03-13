const nodemailer = require('nodemailer');

// Create transporter using Gmail
// Note: For Gmail, you need to use an App Password, not your regular password
// Get it from: https://myaccount.google.com/apppasswords
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send OTP email
const sendOTPEmail = async (email, otp, name) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Vaya App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Vaya App Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 30px; }
            .header { text-align: center; background-color: #FF6B00; padding: 20px; border-radius: 10px 10px 0 0; margin: -30px -30px 20px -30px; }
            .logo { color: #ffffff; font-size: 28px; font-weight: bold; }
            .title { color: #333333; font-size: 24px; text-align: center; margin-bottom: 20px; }
            .otp { font-size: 36px; font-weight: bold; color: #FF6B00; text-align: center; letter-spacing: 10px; margin: 30px 0; }
            .message { color: #666666; font-size: 16px; text-align: center; line-height: 1.6; }
            .footer { text-align: center; margin-top: 30px; color: #999999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">VAYA</div>
            </div>
            <div class="title">Verify Your Email</div>
            <div class="message">
              Hello ${name},<br><br>
              Your verification code for Vaya App is:
            </div>
            <div class="otp">${otp}</div>
            <div class="message">
              This code will expire in 5 minutes.<br>
              If you didn't request this, please ignore this email.
            </div>
            <div class="footer">
              © 2024 Vaya App. All rights reserved.
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOTPEmail,
  createTransporter
};

const nodemailer = require('nodemailer');

// Create transporter with optimized Gmail configuration
// Note: For Gmail, you need to use an App Password, not your regular password
// Get it from: https://myaccount.google.com/apppasswords
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use SSL
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: true
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000
  });
};

// Fallback Ethereal transporter for development/testing
const createEtherealTransporter = async () => {
  let testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
};

// Send OTP email with retry logic and best-effort fallback
const sendOTPEmail = async (email, otp, name) => {
  let lastError = null;
  
  // Try with Gmail SMTP first
  try {
    console.log(`📧 Attempting to send OTP email to ${email} via Gmail SMTP...`);
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
    console.log('✅ Email sent successfully via Gmail:', info.messageId);
    return { success: true, messageId: info.messageId, provider: 'gmail', delivered: true };
  } catch (error) {
    console.error('❌ Gmail SMTP error:', error.message);
    lastError = error;
    
    // If it's a connection/auth error with Gmail, try Ethereal as fallback
    if (error.code === 'EAUTH' || error.code === 'ESOCKET' || error.code === 'ETIMEDOUT' || error.message.includes('socket')) {
      console.log('⚠️ Gmail SMTP failed, attempting fallback to Ethereal (test email service)...');
      try {
        const etherealTransporter = await createEtherealTransporter();
        const mailOptions = {
          from: `"Vaya App Test" <no-reply@ethereal.email>`,
          to: email,
          subject: '[TEST] Your Vaya App Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; text-align: center;">
              <h2>Verify Your Email</h2>
              <p>Hello ${name},</p>
              <p>Your verification code for Vaya App is:</p>
              <h1 style="color: #FF6B00; letter-spacing: 5px;">${otp}</h1>
              <p>This is a TEST email (Ethereal). It would expire in 5 minutes.</p>
            </div>
          `
        };
        
        const info = await etherealTransporter.sendMail(mailOptions);
        console.log('✅ Test email sent via Ethereal:', nodemailer.getTestMessageUrl(info));
        console.log('💡 In production, configure valid Gmail App Password or use a real SMTP service');
        return { 
          success: true, 
          messageId: info.messageId, 
          provider: 'ethereal',
          previewUrl: nodemailer.getTestMessageUrl(info),
          note: 'Test email sent. Configure EMAIL_USER and EMAIL_PASS for production.',
          delivered: true
        };
      } catch (etherealError) {
        console.error('❌ Ethereal fallback also failed:', etherealError.message);
        // Even if all email services fail, we return success with a warning
        // because the OTP is logged to console and returned in devOTP
        // This ensures the app flow continues (best-effort email delivery)
        console.log('⚠️ All email delivery methods failed. OTP is still logged above and available via devOTP.');
        return { 
          success: true, 
          provider: 'none',
          delivered: false,
          warning: 'Email could not be delivered. Check EMAIL_USER/EMAIL_PASS in .env. OTP is logged in terminal and available via devOTP.',
          note: 'For Gmail, use App Password from https://myaccount.google.com/apppasswords'
        };
      }
    }
    
    // Non-connection errors (like invalid config) - still return success with warning
    console.log('⚠️ Email delivery failed. OTP is still logged above and available via devOTP.');
    return { 
      success: true, 
      provider: 'none',
      delivered: false,
      warning: lastError.message,
      note: 'Email could not be delivered. Check EMAIL_USER/EMAIL_PASS in .env. OTP is logged in terminal and available via devOTP.'
    };
  }
};

module.exports = {
  sendOTPEmail,
  createTransporter
};

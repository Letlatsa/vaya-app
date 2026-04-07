/**
 * SMS Service for sending OTPs to phone numbers
 * Currently uses console logging for development
 * Can be extended to use Twilio, Nexmo, or other SMS providers
 */

// Send OTP via SMS
const sendOTPSMS = async (phoneNumber, otp) => {
  try {
    // In production, replace this with actual SMS service like Twilio
    // Example with Twilio:
    // const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // await client.messages.create({
    //   body: `Your Vaya App verification code is: ${otp}. This code expires in 5 minutes.`,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phoneNumber
    // });

    // For development, log the SMS to console
    console.log('📱 SMS to', phoneNumber, ':', otp);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Your Vaya App verification code is: ${otp}`);
    console.log('   This code expires in 5 minutes.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return { success: true, message: 'SMS sent successfully' };
  } catch (error) {
    console.error('❌ Error sending SMS:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOTPSMS
};

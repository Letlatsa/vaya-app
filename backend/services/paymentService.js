// Payment Service - Handle Stripe payments and payment processing
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');

class PaymentService {
  /**
   * Process card payment
   */
  async processCardPayment(tripId, amount, cardToken, clientId, driverId) {
    try {
      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd', // or 'zwl' if Stripe supports
        payment_method: cardToken,
        confirm: true,
        metadata: {
          tripId,
          clientId,
          driverId
        }
      });

      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          transactionId: paymentIntent.id,
          status: 'COMPLETED',
          amount,
          timestamp: new Date()
        };
      } else if (paymentIntent.status === 'requires_action') {
        return {
          success: false,
          requiresAction: true,
          clientSecret: paymentIntent.client_secret,
          message: '3D Secure authentication required'
        };
      }

      throw new Error(`Payment failed: ${paymentIntent.status}`);
    } catch (error) {
      console.error('[PaymentService Error]:', error);
      return {
        success: false,
        error: error.message,
        status: 'FAILED'
      };
    }
  }

  /**
   * Process refund
   */
  async processRefund(transactionId, amount, reason = 'Trip Cancellation') {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: transactionId,
        amount: Math.round(amount * 100),
        reason: 'requested_by_customer',
        metadata: {
          reason
        }
      });

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('[Refund Error]:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Retrieve payment intent status
   */
  async getPaymentStatus(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        clientSecret: paymentIntent.client_secret
      };
    } catch (error) {
      console.error('[GetPaymentStatus Error]:', error);
      throw error;
    }
  }

  /**
   * Create payment method
   */
  async createPaymentMethod(cardData) {
    try {
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: cardData.number,
          exp_month: cardData.expMonth,
          exp_year: cardData.expYear,
          cvc: cardData.cvc
        },
        billing_details: {
          name: cardData.name
        }
      });

      return {
        success: true,
        paymentMethodId: paymentMethod.id,
        lastFour: paymentMethod.card.last4,
        brand: paymentMethod.card.brand
      };
    } catch (error) {
      console.error('[CreatePaymentMethod Error]:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new PaymentService();

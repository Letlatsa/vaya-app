import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  ActivityIndicator, SafeAreaView, Modal, TextInput, ScrollView, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { UserContext } from './_layout';
import api from '@/constants/apiConfig';

const { width: W, height: H } = Dimensions.get('window');
const ORANGE = '#FF6B00';
const DARK = '#1A1A2E';
const GREEN = '#22C55E';

interface Trip {
  _id: string;
  passenger: { name: string };
  driver: { name: string };
  estimatedFare: number;
  distanceCovered: number;
  paymentMethod: string;
  status: string;
}

export default function ClientPayment() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams();
  const { userData, token } = useContext(UserContext);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  const loadTrip = async () => {
    try {
      const response = await api.get(`/trips/${tripId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrip(response.data.data);
    } catch (error) {
      console.error('Load Trip Error:', error);
      alert('Failed to load trip');
    } finally {
      setLoading(false);
    }
  };

  const processCashPayment = async () => {
    if (!trip) return;

    setProcessing(true);
    try {
      const response = await api.post(
        `/payments/process`,
        {
          tripId: trip._id,
          amount: trip.estimatedFare,
          method: 'CASH'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const payment = response.data.data;
      Alert.alert(
        'Payment Recorded',
        `Cash payment of $${payment.amount.toFixed(2)} recorded. Please provide cash to driver.`,
        [
          {
            text: 'Proceed to Rating',
            onPress: () => router.push(`/client-rating?tripId=${trip._id}`)
          }
        ]
      );
    } catch (error) {
      console.error('Payment Error:', error);
      alert('Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const processCardPayment = async () => {
    if (!trip || !cardNumber || !cardExpiry || !cardCvv) {
      alert('Please fill in all card details');
      return;
    }

    setProcessing(true);
    try {
      const response = await api.post(
        `/payments/process`,
        {
          tripId: trip._id,
          amount: trip.estimatedFare,
          method: 'CARD',
          cardToken: {
            number: cardNumber.replace(/\s/g, ''),
            exp_month: parseInt(cardExpiry.split('/')[0]),
            exp_year: parseInt(cardExpiry.split('/')[1]),
            cvc: cardCvv
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const payment = response.data.data;
      setShowCardModal(false);
      
      Alert.alert(
        'Payment Successful',
        `Card payment of $${payment.amount.toFixed(2)} completed successfully.`,
        [
          {
            text: 'Rate Driver',
            onPress: () => router.push(`/client-rating?tripId=${trip._id}`)
          }
        ]
      );
    } catch (error) {
      console.error('Card Payment Error:', error);
      alert('Card payment failed. Please try again or use cash.');
    } finally {
      setProcessing(false);
    }
  };

  const skipPayment = () => {
    Alert.alert(
      'Skip Payment',
      'You can pay cash to the driver later. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          onPress: () => router.push(`/client-rating?tripId=${tripId}`)
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ORANGE} />
          <Text style={styles.loadingText}>Loading payment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Trip not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Trip Complete! 🎉</Text>
          <Text style={styles.subtitle}>Thank you for using Vaya Cabs</Text>
        </View>

        {/* Trip Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Driver</Text>
            <Text style={styles.summaryValue}>{trip.driver.name}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Distance</Text>
            <Text style={styles.summaryValue}>{trip.distanceCovered.toFixed(1)} km</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Trip Time</Text>
            <Text style={styles.summaryValue}>~15 minutes</Text>
          </View>
        </View>

        {/* Fare Breakdown */}
        <View style={styles.fareCard}>
          <Text style={styles.fareCardTitle}>Fare Breakdown</Text>
          <View style={styles.fareBreakdown}>
            <View style={styles.fareItem}>
              <Text style={styles.fareItemLabel}>Base Fare</Text>
              <Text style={styles.fareItemValue}>$60.00</Text>
            </View>
            <View style={styles.fareItem}>
              <Text style={styles.fareItemLabel}>Distance ({trip.distanceCovered.toFixed(1)} km)</Text>
              <Text style={styles.fareItemValue}>${(trip.distanceCovered * 10).toFixed(2)}</Text>
            </View>
            <View style={[styles.fareItem, styles.totalFare]}>
              <Text style={styles.totalLabel}>Total Fare</Text>
              <Text style={styles.totalAmount}>${trip.estimatedFare.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>

          {/* Cash Payment */}
          <TouchableOpacity
            style={styles.paymentOption}
            onPress={processCashPayment}
            disabled={processing}
          >
            <View style={styles.paymentIcon}>
              <Text style={styles.iconText}>💵</Text>
            </View>
            <View style={styles.paymentDetails}>
              <Text style={styles.paymentTitle}>Pay with Cash</Text>
              <Text style={styles.paymentSubtitle}>Pay the driver directly with cash</Text>
            </View>
            {processing ? (
              <ActivityIndicator color={ORANGE} />
            ) : (
              <Text style={styles.paymentArrow}>›</Text>
            )}
          </TouchableOpacity>

          {/* Card Payment */}
          <TouchableOpacity
            style={styles.paymentOption}
            onPress={() => setShowCardModal(true)}
            disabled={processing}
          >
            <View style={styles.paymentIcon}>
              <Text style={styles.iconText}>💳</Text>
            </View>
            <View style={styles.paymentDetails}>
              <Text style={styles.paymentTitle}>Pay with Card</Text>
              <Text style={styles.paymentSubtitle}>Visa, Mastercard, Amex</Text>
            </View>
            {processing ? (
              <ActivityIndicator color={ORANGE} />
            ) : (
              <Text style={styles.paymentArrow}>›</Text>
            )}
          </TouchableOpacity>

          {/* Digital Wallet */}
          <TouchableOpacity style={styles.paymentOption}>
            <View style={styles.paymentIcon}>
              <Text style={styles.iconText}>📱</Text>
            </View>
            <View style={styles.paymentDetails}>
              <Text style={styles.paymentTitle}>Digital Wallet</Text>
              <Text style={styles.paymentSubtitle}>Coming soon</Text>
            </View>
            <Text style={styles.comingSoon}>Soon</Text>
          </TouchableOpacity>
        </View>

        {/* Skip Button */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={skipPayment}
          disabled={processing}
        >
          <Text style={styles.skipButtonText}>Pay Later</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Card Payment Modal */}
      <Modal visible={showCardModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCardModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Card</Text>
            <View />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Card Preview */}
            <View style={styles.cardPreview}>
              <View style={styles.cardFront}>
                <View>
                  <Text style={styles.cardLabel}>Card Number</Text>
                  <Text style={styles.cardDisplay}>
                    {cardNumber || '•••• •••• •••• ••••'}
                  </Text>
                </View>
                <Text style={styles.cardChip}>💳</Text>
              </View>
            </View>

            {/* Card Number */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Card Number</Text>
              <TextInput
                style={styles.input}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={16}
                value={cardNumber}
                onChangeText={(text) => {
                  const formatted = text.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
                  setCardNumber(formatted);
                }}
              />
            </View>

            {/* Expiry and CVV */}
            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flex]}>
                <Text style={styles.formLabel}>MM/YY</Text>
                <TextInput
                  style={styles.input}
                  placeholder="12/25"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={5}
                  value={cardExpiry}
                  onChangeText={(text) => {
                    let formatted = text.replace(/\D/g, '');
                    if (formatted.length >= 2) {
                      formatted = formatted.slice(0, 2) + '/' + formatted.slice(2, 4);
                    }
                    setCardExpiry(formatted);
                  }}
                />
              </View>

              <View style={[styles.formGroup, styles.flex]}>
                <Text style={styles.formLabel}>CVV</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={3}
                  secureTextEntry
                  value={cardCvv}
                  onChangeText={setCardCvv}
                />
              </View>
            </View>

            {/* Payment Amount */}
            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>Amount to Pay</Text>
              <Text style={styles.amountValue}>${trip.estimatedFare.toFixed(2)}</Text>
            </View>

            {/* Pay Button */}
            <TouchableOpacity
              style={[styles.payButton, processing && styles.payButtonDisabled]}
              onPress={processCardPayment}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.payButtonText}>Pay ${trip.estimatedFare.toFixed(2)}</Text>
              )}
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowCardModal(false)}
              disabled={processing}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, fontSize: 16, color: DARK },
  errorText: { fontSize: 18, color: DARK },
  header: { paddingVertical: 20, paddingHorizontal: 20, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: DARK, marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#666' },
  summaryCard: { marginHorizontal: 20, marginVertical: 15, paddingVertical: 15, paddingHorizontal: 15, backgroundColor: '#f5f5f5', borderRadius: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  summaryLabel: { fontSize: 14, color: '#666' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: DARK },
  divider: { height: 1, backgroundColor: '#ddd' },
  fareCard: { marginHorizontal: 20, marginVertical: 15, paddingVertical: 15, paddingHorizontal: 15, backgroundColor: ORANGE, borderRadius: 12 },
  fareCardTitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 12 },
  fareBreakdown: { gap: 10 },
  fareItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  fareItemLabel: { fontSize: 13, color: '#fff', opacity: 0.9 },
  fareItemValue: { fontSize: 13, fontWeight: '600', color: '#fff' },
  totalFare: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.3)', paddingTop: 12, marginTop: 8 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
  totalAmount: { fontSize: 18, fontWeight: '700', color: '#fff' },
  section: { marginVertical: 15, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: DARK, marginBottom: 12 },
  paymentOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: '#ddd', borderRadius: 12, marginBottom: 10 },
  paymentIcon: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  iconText: { fontSize: 24 },
  paymentDetails: { flex: 1 },
  paymentTitle: { fontSize: 14, fontWeight: '600', color: DARK },
  paymentSubtitle: { fontSize: 12, color: '#666', marginTop: 3 },
  paymentArrow: { fontSize: 24, color: ORANGE },
  comingSoon: { fontSize: 12, color: '#999', fontWeight: '600' },
  skipButton: { marginHorizontal: 20, marginVertical: 15, paddingVertical: 14, paddingHorizontal: 20, borderWidth: 1, borderColor: ORANGE, borderRadius: 12, alignItems: 'center' },
  skipButtonText: { color: ORANGE, fontWeight: '700', fontSize: 16 },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  closeButton: { fontSize: 24, color: DARK },
  modalTitle: { fontSize: 18, fontWeight: '700', color: DARK },
  modalContent: { flex: 1, paddingHorizontal: 20, paddingVertical: 20 },
  cardPreview: { marginVertical: 20, alignItems: 'center' },
  cardFront: { width: W - 80, paddingVertical: 20, paddingHorizontal: 20, backgroundColor: ORANGE, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLabel: { fontSize: 11, color: '#fff', opacity: 0.8 },
  cardDisplay: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 5, letterSpacing: 2 },
  cardChip: { fontSize: 32 },
  formGroup: { marginBottom: 15 },
  formLabel: { fontSize: 12, fontWeight: '600', color: DARK, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 12, fontSize: 14, color: DARK },
  row: { flexDirection: 'row', gap: 15 },
  flex: { flex: 1 },
  amountBox: { marginVertical: 20, paddingVertical: 15, paddingHorizontal: 15, backgroundColor: '#f5f5f5', borderRadius: 10, alignItems: 'center' },
  amountLabel: { fontSize: 12, color: '#666' },
  amountValue: { fontSize: 28, fontWeight: '700', color: DARK, marginTop: 5 },
  payButton: { paddingVertical: 14, backgroundColor: GREEN, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelButton: { paddingVertical: 14, borderWidth: 1, borderColor: '#ddd', borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { color: DARK, fontWeight: '600', fontSize: 14 }
});

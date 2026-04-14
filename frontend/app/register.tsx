import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import api, { API_ENDPOINTS } from '@/constants/apiConfig';

export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [errors, setErrors] = useState({ name: '', email: '', phone: '' });

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = () => {
    const newErrors = { name: '', email: '', phone: '' };
    let valid = true;

    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = 'Enter a valid full name (min 2 characters)';
      valid = false;
    }
    if (!email.trim() || !emailRegex.test(email.trim())) {
      newErrors.email = 'Enter a valid email address';
      valid = false;
    }
    if (!phoneNumber.trim()) {
      newErrors.phone = 'Enter your phone number';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSendOTP = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const response = await api.post(API_ENDPOINTS.REGISTER, {
        name: name.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
      });

      if (response.data.success) {
        setModalTitle('OTP Sent ✓');
        setModalMessage('A verification code has been sent to your email.');
        setIsSuccess(true);
        setModalVisible(true);
        setTimeout(() => {
          setModalVisible(false);
          router.replace({ pathname: '/verify-otp' as any, params: { email: email.trim() } });
        }, 2000);
      }
    } catch (error: any) {
      setModalTitle('Registration Failed');
      setModalMessage(error.response?.data?.message || 'Failed to send OTP. Please try again.');
      setIsSuccess(false);
      setModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>

        {/* Header */}
        <View style={styles.header}>
          <Image source={require('@/assets/images/Logo.jpeg')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started with Vaya</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={inputStyle('name')}
              placeholder="John Doe"
              placeholderTextColor="#aaa"
              value={name}
              onChangeText={(v) => { setName(v); setErrors(e => ({ ...e, name: '' })); }}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isLoading}
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={inputStyle('email')}
              placeholder="you@example.com"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={(v) => { setEmail(v); setErrors(e => ({ ...e, email: '' })); }}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={inputStyle('phone')}
              placeholder="+266 5000 0000"
              placeholderTextColor="#aaa"
              value={phoneNumber}
              onChangeText={(v) => { setPhoneNumber(v); setErrors(e => ({ ...e, phone: '' })); }}
              onFocus={() => setFocusedField('phone')}
              onBlur={() => setFocusedField(null)}
              keyboardType="phone-pad"
              editable={!isLoading}
            />
            {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSendOTP}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Send OTP</Text>
            }
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/login' as any)} disabled={isLoading}>
              <Text style={styles.loginLink}> Sign In</Text>
            </TouchableOpacity>
          </View>

        </View>
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal animationType="fade" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalIconContainer, isSuccess ? styles.iconSuccess : styles.iconError]}>
              <Text style={styles.modalIcon}>{isSuccess ? '✓' : '✕'}</Text>
            </View>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <TouchableOpacity
              style={[styles.modalButton, isSuccess ? styles.modalButtonSuccess : styles.modalButtonError]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>{isSuccess ? 'OK' : 'Try Again'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const ORANGE = '#FF6B00';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40, paddingHorizontal: 16 },
  card: { width: '100%', maxWidth: 480, backgroundColor: '#fff', borderRadius: 16, padding: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },

  header: { alignItems: 'center', marginBottom: 36 },
  logo: { width: 80, height: 80, marginBottom: 16, borderRadius: 16 },
  title: { fontSize: 26, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#888' },

  form: { width: '100%' },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#fafafa',
  },
  inputFocused: { borderColor: ORANGE, backgroundColor: '#fff' },
  errorText: { fontSize: 12, color: '#e53935', marginTop: 4, marginLeft: 2 },

  button: {
    backgroundColor: ORANGE,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { backgroundColor: '#ccc', shadowOpacity: 0 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14, color: '#888' },
  loginLink: { fontSize: 14, color: ORANGE, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', width: '82%' },
  modalIconContainer: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  iconSuccess: { backgroundColor: '#4CAF50' },
  iconError: { backgroundColor: '#e53935' },
  modalIcon: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 8, textAlign: 'center' },
  modalMessage: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalButton: { paddingVertical: 12, paddingHorizontal: 40, borderRadius: 10 },
  modalButtonSuccess: { backgroundColor: ORANGE },
  modalButtonError: { backgroundColor: '#e53935' },
  modalButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

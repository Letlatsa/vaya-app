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

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(false);
  const [emailError, setEmailError] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = () => {
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setEmailError('Enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSendOTP = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const response = await api.post(API_ENDPOINTS.LOGIN, { email: email.trim() });

      if (response.data.success) {
        setModalTitle('OTP Sent ✓');
        setModalMessage('A verification code has been sent to your email.');
        setIsSuccess(true);
        setModalVisible(true);
        setTimeout(() => {
          setModalVisible(false);
          router.replace({ pathname: '/verify-otp' as any, params: { email: email.trim(), isLogin: 'true' } });
        }, 2000);
      }
    } catch (error: any) {
      setModalTitle(error.response?.status === 404 ? 'Account Not Found' : 'Login Failed');
      setModalMessage(
        error.response?.status === 404
          ? 'No account found with this email. Please check your spelling or create a new account.'
          : error.response?.data?.message || 'Failed to send OTP. Please try again.'
      );
      setIsSuccess(false);
      setModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.replace('/' as any)} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <Image source={require('@/assets/images/Logo.jpeg')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue with Vaya</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[styles.input, focusedField && styles.inputFocused]}
                placeholder="you@example.com"
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={(v) => { setEmail(v); setEmailError(''); }}
                onFocus={() => setFocusedField(true)}
                onBlur={() => setFocusedField(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
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
              <Text style={styles.footerText}>Don't have an account?</Text>
              <TouchableOpacity onPress={() => router.push('/register')} disabled={isLoading}>
                <Text style={styles.registerLink}> Sign Up</Text>
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
  backBtn: { alignSelf: 'flex-start', marginBottom: 8 },
  backBtnText: { fontSize: 14, color: ORANGE, fontWeight: '600' },
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
  registerLink: { fontSize: 14, color: ORANGE, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', width: '82%', maxWidth: 400 },
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

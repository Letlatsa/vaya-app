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

export default function DriverLoginScreen() {
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
      const response = await api.post(API_ENDPOINTS.DRIVER_LOGIN, { email: email.trim() });

      if (response.data.success) {
        setModalTitle('OTP Sent ✓');
        setModalMessage('A verification code has been sent to your email.');
        setIsSuccess(true);
        setModalVisible(true);
        setTimeout(() => {
          setModalVisible(false);
          router.replace({ pathname: '/verify-otp' as any, params: { email: email.trim(), isLogin: 'true', isDriver: 'true' } });
        }, 2000);
      }
    } catch (error: any) {
      setModalTitle(error.response?.status === 404 ? 'Account Not Found' : 'Login Failed');
      setModalMessage(
        error.response?.status === 404
          ? 'No driver account found with this email. Please check your spelling or register as a new driver.'
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
            <Text style={styles.title}>Driver Sign In</Text>
            <Text style={styles.subtitle}>Welcome back to Vaya</Text>
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
              <Text style={styles.footerText}>Not a driver yet?</Text>
              <TouchableOpacity onPress={() => router.push('/driver-register')} disabled={isLoading}>
                <Text style={styles.registerLink}> Register Now</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 16,
  },
  backBtnText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  inputFocused: {
    borderColor: '#FF6B00',
    backgroundColor: '#fff',
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 6,
  },
  button: {
    backgroundColor: '#FF6B00',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  registerLink: {
    color: '#FF6B00',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconSuccess: {
    backgroundColor: '#4CAF50',
  },
  iconError: {
    backgroundColor: '#f44336',
  },
  modalIcon: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  modalButtonSuccess: {
    backgroundColor: '#FF6B00',
  },
  modalButtonError: {
    backgroundColor: '#f44336',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

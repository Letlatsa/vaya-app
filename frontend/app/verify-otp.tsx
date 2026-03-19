import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api, { API_ENDPOINTS } from '@/constants/apiConfig';

// API URL from config
const VERIFY_OTP_URL = API_ENDPOINTS.VERIFY_OTP;

export default function OTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { email } = params;
  
  const { width, height } = useWindowDimensions();
  
  // Responsive sizes
  const logoSize = Math.min(width, height) * 0.15;
  const titleFontSize = Math.min(width, height) * 0.04;
  const subtitleFontSize = Math.min(width, height) * 0.025;
  const inputFontSize = Math.min(width, height) * 0.05;
  const buttonFontSize = Math.min(width, height) * 0.02;
  const paddingHorizontal = width * 0.08;
  
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Focus on first input when screen loads
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Submit when all digits are entered
    if (value && index === 3) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 4) {
        handleVerify(fullOtp);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const finalOtp = otpCode || otp.join('');
    
    if (finalOtp.length !== 4) {
      setModalTitle('Validation Error');
      setModalMessage('Please enter the complete 4-digit OTP');
      setIsSuccess(false);
      setModalVisible(true);
      return;
    }

    if (!email) {
      setModalTitle('Error');
      setModalMessage('Email not found. Please go back and try again.');
      setIsSuccess(false);
      setModalVisible(true);
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post(VERIFY_OTP_URL, {
        email: email,
        otp: finalOtp
      });

      if (response.data.success) {
        setModalTitle('Success');
        setModalMessage('Registration successful! Welcome to Vaya.');
        setIsSuccess(true);
        setModalVisible(true);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Invalid OTP. Please try again.';
      setModalTitle('Verification Failed');
      setModalMessage(errorMessage);
      setIsSuccess(false);
      setModalVisible(true);
      // Clear OTP inputs
      setOtp(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    if (isSuccess) {
      router.replace('/(tabs)');
    }
  };

  const handleResendOTP = async () => {
    // Navigate back to register to request new OTP
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.content, { paddingHorizontal }]}>
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/Logo.jpeg')}
            style={[styles.logo, { width: logoSize, height: logoSize }]}
            resizeMode="contain"
          />
          <Text style={[styles.title, { fontSize: titleFontSize }]}>Verify Your Email</Text>
          <Text style={[styles.subtitle, { fontSize: subtitleFontSize }]}>
            We have sent a 4-digit code to{'\n'}
            <Text style={styles.emailText}>{email}</Text>
          </Text>
        </View>

        {/* OTP Input */}
        <View style={styles.otpContainer}>
          <View style={styles.otpInputs}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref as any; }}
                style={[styles.otpInput, { fontSize: inputFontSize }]}
                value={digit}
                onChangeText={(value) => handleOtpChange(value.replace(/[^0-9]/g, ''), index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                editable={!isLoading}
              />
            ))}
          </View>
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={() => handleVerify()}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.buttonText, { fontSize: buttonFontSize }]}>Verify</Text>
          )}
        </TouchableOpacity>

        {/* Resend Link */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { fontSize: subtitleFontSize * 0.9 }]}>
            Did not receive the code?
          </Text>
          <TouchableOpacity onPress={handleResendOTP}>
            <Text style={[styles.resendLink, { fontSize: subtitleFontSize * 0.9 }]}> Resend</Text>
          </TouchableOpacity>
        </View>

        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={[styles.backText, { fontSize: subtitleFontSize * 0.9 }]}>
            ← Back to Registration
          </Text>
        </TouchableOpacity>
      </View>

      {/* Custom Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: width * 0.85, maxWidth: 350 }]}>
            <View style={[
              styles.modalIconContainer,
              { width: modalIconSize, height: modalIconSize, borderRadius: modalIconSize / 2 },
              isSuccess ? styles.modalIconSuccess : styles.modalIconError
            ]}>
              <Text style={[styles.modalIcon, { fontSize: modalIconSize * 0.5 }]}>
                {isSuccess ? '✓' : '✕'}
              </Text>
            </View>
            <Text style={[styles.modalTitle, { fontSize: titleFontSize }]}>{modalTitle}</Text>
            <Text style={[styles.modalMessage, { fontSize: subtitleFontSize * 1.2 }]}>{modalMessage}</Text>
            <TouchableOpacity
              style={[
                styles.modalButton,
                { paddingVertical: height * 0.02, paddingHorizontal: width * 0.1, borderRadius: width * 0.08 },
                isSuccess ? styles.modalButtonSuccess : styles.modalButtonError
              ]}
              onPress={handleModalClose}
            >
              <Text style={[styles.modalButtonText, { fontSize: subtitleFontSize * 1.2 }]}>
                {isSuccess ? 'Continue' : 'Try Again'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const modalIconSize = 70;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    marginBottom: 20,
  },
  title: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  emailText: {
    color: '#FF6B00',
    fontWeight: '600',
  },
  otpContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  otpInputs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  otpInput: {
    width: 60,
    height: 70,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 12,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#FF6B00',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#666',
  },
  resendLink: {
    color: '#FF6B00',
    fontWeight: 'bold',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 30,
  },
  backText: {
    color: '#666',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: '6%',
    alignItems: 'center',
  },
  modalIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '5%',
  },
  modalIconSuccess: {
    backgroundColor: '#4CAF50',
  },
  modalIconError: {
    backgroundColor: '#f44336',
  },
  modalIcon: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalTitle: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '2.5%',
    textAlign: 'center',
  },
  modalMessage: {
    color: '#666',
    textAlign: 'center',
    marginBottom: '6%',
  },
  modalButton: {
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
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

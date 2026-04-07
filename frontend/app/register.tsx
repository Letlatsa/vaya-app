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
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import api, { API_ENDPOINTS } from '@/constants/apiConfig';

// API URL from config
const REGISTER_ENDPOINT = API_ENDPOINTS.REGISTER;

export default function RegisterScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  
  // Responsive sizes based on screen dimensions
  const logoSize = Math.min(width, height) * 0.2;
  const titleFontSize = Math.min(width, height) * 0.045;
  const subtitleFontSize = Math.min(width, height) * 0.025;
  const labelFontSize = Math.min(width, height) * 0.018;
  const inputFontSize = Math.min(width, height) * 0.02;
  const buttonFontSize = Math.min(width, height) * 0.02;
  const paddingHorizontal = width * 0.08;
  const paddingVertical = height * 0.03;
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const validateInputs = () => {
    if (!name.trim()) {
      setModalTitle('Validation Error');
      setModalMessage('Please enter your name');
      setIsSuccess(false);
      setModalVisible(true);
      return false;
    }
    if (name.trim().length < 2) {
      setModalTitle('Validation Error');
      setModalMessage('Name must be at least 2 characters');
      setIsSuccess(false);
      setModalVisible(true);
      return false;
    }
    if (!email.trim()) {
      setModalTitle('Validation Error');
      setModalMessage('Please enter your email address');
      setIsSuccess(false);
      setModalVisible(true);
      return false;
    }
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setModalTitle('Validation Error');
      setModalMessage('Please enter a valid email address');
      setIsSuccess(false);
      setModalVisible(true);
      return false;
    }
    if (!phoneNumber.trim()) {
      setModalTitle('Validation Error');
      setModalMessage('Please enter your phone number');
      setIsSuccess(false);
      setModalVisible(true);
      return false;
    }
    return true;
  };

  const handleSendOTP = async () => {
    if (!validateInputs()) return;

    setIsLoading(true);

    try {
      const response = await api.post(REGISTER_ENDPOINT, {
        name: name.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
      });

      if (response.data.success) {
        setModalTitle('OTP Sent');
        setModalMessage('Please check your email for the verification code.');
        setIsSuccess(true);
        setModalVisible(true);
        
        // Navigate to OTP screen after modal is dismissed
        setTimeout(() => {
          setModalVisible(false);
          router.replace({ pathname: '/verify-otp' as any, params: { email: email.trim() } });
        }, 2000);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to send OTP. Please try again.';
      setModalTitle('Error');
      setModalMessage(errorMessage);
      setIsSuccess(false);
      setModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal, paddingVertical: paddingVertical * 1.5 }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/Logo.jpeg')}
            style={[styles.logo, { width: logoSize, height: logoSize }]}
            resizeMode="contain"
          />
          <Text style={[styles.subtitle, { fontSize: subtitleFontSize }]}>Create your account</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { fontSize: labelFontSize }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { fontSize: inputFontSize }]}
              placeholder="Enter your full name"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { fontSize: labelFontSize }]}>Email Address</Text>
            <TextInput
              style={[styles.input, { fontSize: inputFontSize }]}
              placeholder="Enter your email address"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { fontSize: labelFontSize }]}>Phone Number</Text>
            <TextInput
              style={[styles.input, { fontSize: inputFontSize }]}
              placeholder="Enter your phone number"
              placeholderTextColor="#999"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSendOTP}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.buttonText, { fontSize: buttonFontSize }]}>Send OTP</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { fontSize: labelFontSize * 0.9 }]}>Already have an account?</Text>
            <TouchableOpacity disabled={isLoading}>
              <Text style={[styles.loginLink, { fontSize: labelFontSize * 0.9 }]}> Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Custom Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: modalWidth, maxWidth: modalMaxWidth }]}>
            <View style={[
              styles.modalIconContainer,
              { width: modalIconSize, height: modalIconSize, borderRadius: modalIconSize / 2 },
              isSuccess ? styles.modalIconSuccess : styles.modalIconError
            ]}>
              <Text style={[styles.modalIcon, { fontSize: modalIconSize * 0.5 }]}>{isSuccess ? '✓' : '✕'}</Text>
            </View>
            <Text style={[styles.modalTitle, { fontSize: modalFontSize }]}>{modalTitle}</Text>
            <Text style={[styles.modalMessage, { fontSize: modalMessageSize }]}>{modalMessage}</Text>
            <TouchableOpacity
              style={[
                styles.modalButton,
                { paddingVertical: height * 0.02, paddingHorizontal: width * 0.1, borderRadius: width * 0.08 },
                isSuccess ? styles.modalButtonSuccess : styles.modalButtonError
              ]}
              onPress={handleModalClose}
            >
              <Text style={[styles.modalButtonText, { fontSize: modalMessageSize }]}>
                {isSuccess ? 'OK' : 'Try Again'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// Modal responsive sizes
const modalIconSize = Math.min(350, 70);
const modalWidth = '85%';
const modalMaxWidth = 350;
const modalFontSize = 22;
const modalMessageSize = 16;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    marginBottom: 10,
  },
  subtitle: {
    color: '#666',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#FF6B00',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
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
  loginLink: {
    color: '#FF6B00',
    fontWeight: 'bold',
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

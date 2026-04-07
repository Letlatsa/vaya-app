import React, { useState, useContext, useRef, useEffect } from 'react';
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
import axios from 'axios';
import { UserContext } from './_layout';
import authStorage from '@/utils/authStorage';

const API_URL = 'http://localhost:5000/api/users';

export default function OTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { email, isLogin } = params;
  const { updateUserData } = useContext(UserContext);
  
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
  
  // Create refs for OTP inputs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputsRef = useRef<any[]>([]);
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleOtpChange = (value: string, index: number) => {
    // Not used anymore with single input
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace - just log for now
    console.log('Key pressed:', e.nativeEvent.key, 'at index:', index);
  };

  // Fetch user data after successful login
  const fetchUserData = async (userEmail: string) => {
    try {
      // First, find the user by email to get their ID
      const usersResponse = await axios.get(`${API_URL}?email=${userEmail}`);
      
      if (usersResponse.data.success && usersResponse.data.data.length > 0) {
        const user = usersResponse.data.data[0];
        
        // Update the context with user data
        updateUserData({
          _id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          profilePicture: user.profilePicture,
          balance: user.balance || 0,
          totalRides: user.totalRides || 0,
          starRating: user.starRating || 0,
        });
        
        return user;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const finalOtp = otpCode || otp.join('');
    
    console.log('OTP being sent:', finalOtp);
    console.log('Email:', email);
    
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
      // Use different endpoint for login vs registration
      const endpoint = isLogin === 'true' ? '/login-verify' : '/verify-otp';
      const response = await axios.post(`${API_URL}${endpoint}`, {
        email: email,
        otp: finalOtp
      });

      if (response.data.success) {
        // Save token to storage
        if (response.data.token) {
          await authStorage.setToken(response.data.token);
        }

        // If this is a login flow, use user data from response directly
        if (isLogin === 'true' && response.data.data) {
          const user = response.data.data;
          
          // Update the context with user data
          updateUserData({
            _id: user._id,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            profilePicture: user.profilePicture,
            balance: user.balance || 0,
            totalRides: user.totalRides || 0,
            starRating: user.starRating || 0,
          });
          
          setModalTitle('Success');
          setModalMessage('Login successful! Welcome back.');
          setIsSuccess(true);
          setModalVisible(true);
        } else {
          // For registration, fetch user data from response
          if (response.data.data) {
            updateUserData({
              _id: response.data.data.id,
              name: response.data.data.name,
              email: response.data.data.email,
              phoneNumber: response.data.data.phoneNumber,
              profilePicture: null,
              balance: 0,
              totalRides: 0,
              starRating: 0,
            });
          }
          setModalTitle('Success');
          setModalMessage('Registration successful! Welcome to Vaya.');
          setIsSuccess(true);
          setModalVisible(true);
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Invalid OTP. Please try again.';
      setModalTitle('Verification Failed');
      setModalMessage(errorMessage);
      setIsSuccess(false);
      setModalVisible(true);
      // Clear OTP inputs
      setOtp(['', '', '', '']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    if (isSuccess) {
      // Navigate to home (tabs) after successful login/registration
      router.replace('/(tabs)');
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    try {
      const loginParam = isLogin === 'true' ? '/login' : '/register';
      const response = await axios.post(`${API_URL}${loginParam}`, {
        email: email,
      });
      
      if (response.data.success) {
        setModalTitle('OTP Sent');
        setModalMessage('A new OTP has been sent to your email.');
        setIsSuccess(true);
        setModalVisible(true);
      }
    } catch (error: any) {
      setModalTitle('Error');
      setModalMessage(error.response?.data?.message || 'Failed to resend OTP.');
      setIsSuccess(false);
      setModalVisible(true);
    } finally {
      setIsLoading(false);
    }
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

        {/* OTP Input - Single field for 4 digits */}
        <View style={styles.otpContainer}>
          <TextInput
            style={[styles.otpInputSingle, { fontSize: inputFontSize }]}
            value={otp.join('')}
            onChangeText={(value) => {
              // Only keep numeric characters and max 4 digits
              const numericValue = value.replace(/[^0-9]/g, '').slice(0, 4);
              const newOtp = numericValue.split('').concat(['', '', '', '']).slice(0, 4);
              setOtp(newOtp);
              
              // Auto-submit when 4 digits are entered
              if (numericValue.length === 4) {
                handleVerify(numericValue);
              }
            }}
            keyboardType="number-pad"
            maxLength={4}
            selectTextOnFocus
            editable={!isLoading}
            placeholder="----"
            placeholderTextColor="#ccc"
          />
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
          <TouchableOpacity onPress={handleResendOTP} disabled={isLoading}>
            <Text style={[styles.resendLink, { fontSize: subtitleFontSize * 0.9 }]}> Resend</Text>
          </TouchableOpacity>
        </View>

        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={[styles.backText, { fontSize: subtitleFontSize * 0.9 }]}>
            ← Back
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
  otpInputSingle: {
    width: 200,
    height: 70,
    borderWidth: 2,
    borderColor: '#FF6B00',
    borderRadius: 12,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 32,
    color: '#333',
    backgroundColor: '#f9f9f9',
    letterSpacing: 16,
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

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
import { useRouter, useLocalSearchParams } from 'expo-router';
import api, { API_ENDPOINTS } from '@/constants/apiConfig';

interface DriverCarData {
  carMake: string;
  carModel: string;
  registrationNumber: string;
  carColor: string;
  passengerCount: string;
}

export default function DriverCarScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width, height } = useWindowDimensions();
  
  const logoSize = Math.min(width, height) * 0.12;
  const titleFontSize = Math.min(width, height) * 0.04;
  const subtitleFontSize = Math.min(width, height) * 0.025;
  const labelFontSize = Math.min(width, height) * 0.018;
  const inputFontSize = Math.min(width, height) * 0.02;
  const buttonFontSize = Math.min(width, height) * 0.02;
  const paddingHorizontal = width * 0.08;
  const paddingVertical = height * 0.03;

  const [formData, setFormData] = useState<DriverCarData>({
    carMake: '',
    carModel: '',
    registrationNumber: '',
    carColor: '',
    passengerCount: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (field: keyof DriverCarData, value: string) => {
    if (field === 'registrationNumber') {
      // Format: A 123 BCD
      let formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (formatted.length > 1) {
        formatted = formatted.slice(0, 1) + ' ' + formatted.slice(1, 4) + ' ' + formatted.slice(4, 7);
      }
      setFormData(prev => ({ ...prev, [field]: formatted.slice(0, 9) }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const validateInputs = () => {
    if (!formData.carMake.trim()) {
      setModalTitle('Validation Error');
      setModalMessage('Please enter car make (e.g., Toyota, BMW)');
      setIsSuccess(false);
      setModalVisible(true);
      return false;
    }
    if (!formData.carModel.trim()) {
      setModalTitle('Validation Error');
      setModalMessage('Please enter car model (e.g., Corolla, X5)');
      setIsSuccess(false);
      setModalVisible(true);
      return false;
    }
    if (!formData.registrationNumber.trim()) {
      setModalTitle('Validation Error');
      setModalMessage('Please enter registration number');
      setIsSuccess(false);
      setModalVisible(true);
      return false;
    }
    const regPattern = /^[A-Z]\s?\d{3}\s?[A-Z]{3}$/;
    if (!regPattern.test(formData.registrationNumber.trim())) {
      setModalTitle('Validation Error');
      setModalMessage('Format: A 123 BCD (e.g., A 123 BCD)');
      setIsSuccess(false);
      setModalVisible(true);
      return false;
    }
    if (!formData.carColor.trim()) {
      setModalTitle('Validation Error');
      setModalMessage('Please enter car color');
      setIsSuccess(false);
      setModalVisible(true);
      return false;
    }
    if (!formData.passengerCount.trim()) {
      setModalTitle('Validation Error');
      setModalMessage('Please enter number of passengers');
      setIsSuccess(false);
      setModalVisible(true);
      return false;
    }
    const passengers = parseInt(formData.passengerCount);
    if (isNaN(passengers) || passengers < 1 || passengers > 10) {
      setModalTitle('Validation Error');
      setModalMessage('Passengers must be between 1 and 10');
      setIsSuccess(false);
      setModalVisible(true);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateInputs()) return;

    setIsLoading(true);

    try {
      const driverData = {
        fullName: params.name,
        email: params.email,
        phoneNumber: params.phone,
        profilePicture: params.profilePic,
        licenseNumber: params.licenseNumber,
        licenseFront: params.licenseFront,
        licenseBack: params.licenseBack,
        carMake: formData.carMake,
        carModel: formData.carModel,
        registrationNumber: formData.registrationNumber,
        carColor: formData.carColor,
        passengerCount: parseInt(formData.passengerCount),
      };

      const response = await api.post(API_ENDPOINTS.DRIVER_REGISTER, driverData);

      if (response.data.success) {
        router.replace('/driver-success');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to submit application. Please try again.';
      setModalTitle('Error');
      setModalMessage(errorMessage);
      setIsSuccess(false);
      setModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
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
          <Text style={[styles.title, { fontSize: titleFontSize }]}>Become a Driver</Text>
          <Text style={[styles.subtitle, { fontSize: subtitleFontSize }]}>Step 3 of 3 - Car Details</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <Text style={[styles.progressText, { fontSize: labelFontSize * 0.9 }]}>3/3</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { fontSize: labelFontSize }]}>Make</Text>
            <TextInput
              style={[styles.input, { fontSize: inputFontSize }]}
              placeholder="e.g., Toyota, BMW, Ford"
              placeholderTextColor="#999"
              value={formData.carMake}
              onChangeText={(value) => handleInputChange('carMake', value)}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { fontSize: labelFontSize }]}>Model</Text>
            <TextInput
              style={[styles.input, { fontSize: inputFontSize }]}
              placeholder="e.g., Corolla, X5, Fiesta"
              placeholderTextColor="#999"
              value={formData.carModel}
              onChangeText={(value) => handleInputChange('carModel', value)}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { fontSize: labelFontSize }]}>Registration Number</Text>
            <TextInput
              style={[styles.input, { fontSize: inputFontSize }]}
              placeholder="e.g., A 123 BCD"
              placeholderTextColor="#999"
              value={formData.registrationNumber}
              onChangeText={(value) => handleInputChange('registrationNumber', value)}
              autoCapitalize="characters"
              maxLength={9}
            />
            <Text style={[styles.hintText, { fontSize: labelFontSize * 0.8 }]}>Format: A 123 BCD</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { fontSize: labelFontSize }]}>Color</Text>
            <TextInput
              style={[styles.input, { fontSize: inputFontSize }]}
              placeholder="e.g., White, Black, Silver"
              placeholderTextColor="#999"
              value={formData.carColor}
              onChangeText={(value) => handleInputChange('carColor', value)}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { fontSize: labelFontSize }]}>Number of Passengers</Text>
            <TextInput
              style={[styles.input, { fontSize: inputFontSize }]}
              placeholder="1-10"
              placeholderTextColor="#999"
              value={formData.passengerCount}
              onChangeText={(value) => handleInputChange('passengerCount', value.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.buttonText, { fontSize: buttonFontSize }]}>Submit Application</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBack}
          >
            <Text style={[styles.backText, { fontSize: labelFontSize * 0.9 }]}>← Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
              { width: 60, height: 60, borderRadius: 30 },
              isSuccess ? styles.modalIconSuccess : styles.modalIconError
            ]}>
              <Text style={[styles.modalIcon, { fontSize: 28 }]}>
                {isSuccess ? '✓' : '✕'}
              </Text>
            </View>
            <Text style={[styles.modalTitle, { fontSize: titleFontSize * 0.9 }]}>{modalTitle}</Text>
            <Text style={[styles.modalMessage, { fontSize: subtitleFontSize * 1.1 }]}>{modalMessage}</Text>
            <TouchableOpacity
              style={[
                styles.modalButton,
                { paddingVertical: height * 0.015, paddingHorizontal: width * 0.15, borderRadius: width * 0.05 },
                isSuccess ? styles.modalButtonSuccess : styles.modalButtonError
              ]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={[styles.modalButtonText, { fontSize: subtitleFontSize * 1.1 }]}>
                OK
              </Text>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    marginBottom: 10,
  },
  title: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    color: '#666',
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B00',
    borderRadius: 4,
  },
  progressText: {
    color: '#666',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 18,
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
  hintText: {
    color: '#999',
    marginTop: 5,
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
  backButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  backText: {
    color: '#666',
  },
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
  },
});
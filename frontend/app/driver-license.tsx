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
import api from '@/constants/apiConfig';

interface DriverLicenseData {
  licenseNumber: string;
  licenseFront: string;
  licenseBack: string;
}

export default function DriverLicenseScreen() {
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

  const [formData, setFormData] = useState<DriverLicenseData>({
    licenseNumber: '',
    licenseFront: '',
    licenseBack: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (field: keyof DriverLicenseData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectLicenseFront = () => {
    setFormData(prev => ({ 
      ...prev, 
      licenseFront: 'placeholder_license_front' 
    }));
    setModalTitle('License Front');
    setModalMessage('Image upload will be configured later. Using placeholder for now.');
    setIsSuccess(true);
    setModalVisible(true);
  };

  const handleSelectLicenseBack = () => {
    setFormData(prev => ({ 
      ...prev, 
      licenseBack: 'placeholder_license_back' 
    }));
    setModalTitle('License Back');
    setModalMessage('Image upload will be configured later. Using placeholder for now.');
    setIsSuccess(true);
    setModalVisible(true);
  };

  const validateInputs = () => {
    if (!formData.licenseNumber.trim()) {
      setModalTitle('Validation Error');
      setModalMessage('Please enter your license number');
      setIsSuccess(false);
      setModalVisible(true);
      return false;
    }
    if (formData.licenseNumber.trim().length < 5) {
      setModalTitle('Validation Error');
      setModalMessage('Please enter a valid license number');
      setIsSuccess(false);
      setModalVisible(true);
      return false;
    }
    if (!formData.licenseFront) {
      setModalTitle('Validation Error');
      setModalMessage('Please upload the front image of your license');
      setIsSuccess(false);
      setModalVisible(true);
      return false;
    }
    if (!formData.licenseBack) {
      setModalTitle('Validation Error');
      setModalMessage('Please upload the back image of your license');
      setIsSuccess(false);
      setModalVisible(true);
      return false;
    }
    return true;
  };

  const handleContinue = () => {
    if (!validateInputs()) return;
    
    router.push({
      pathname: '/driver-car',
      params: { 
        name: params.name as string,
        email: params.email as string,
        phone: params.phone as string,
        profilePic: params.profilePic as string,
        licenseNumber: formData.licenseNumber,
        licenseFront: formData.licenseFront,
        licenseBack: formData.licenseBack
      }
    });
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
          <Text style={[styles.subtitle, { fontSize: subtitleFontSize }]}>Step 2 of 3 - License Information</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '66%' }]} />
          </View>
          <Text style={[styles.progressText, { fontSize: labelFontSize * 0.9 }]}>2/3</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { fontSize: labelFontSize }]}>License Number</Text>
            <TextInput
              style={[styles.input, { fontSize: inputFontSize }]}
              placeholder="Enter your license number"
              placeholderTextColor="#999"
              value={formData.licenseNumber}
              onChangeText={(value) => handleInputChange('licenseNumber', value)}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <View style={styles.imageSectionContainer}>
            <Text style={[styles.sectionLabel, { fontSize: labelFontSize }]}>License Images</Text>
            
            <TouchableOpacity 
              style={styles.imagePickerContainer} 
              onPress={handleSelectLicenseFront}
            >
              {formData.licenseFront ? (
                <View style={styles.imageSelected}>
                  <Text style={styles.checkIcon}>✓</Text>
                  <Text style={[styles.imageSelectedText, { fontSize: inputFontSize * 0.8 }]}>Front Uploaded</Text>
                </View>
              ) : (
                <View style={styles.imagePicker}>
                  <Text style={styles.cameraIcon}>📄</Text>
                  <Text style={[styles.imagePickerText, { fontSize: inputFontSize }]}>Upload License Front</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.imagePickerContainer, { marginTop: 12 }]} 
              onPress={handleSelectLicenseBack}
            >
              {formData.licenseBack ? (
                <View style={styles.imageSelected}>
                  <Text style={styles.checkIcon}>✓</Text>
                  <Text style={[styles.imageSelectedText, { fontSize: inputFontSize * 0.8 }]}>Back Uploaded</Text>
                </View>
              ) : (
                <View style={styles.imagePicker}>
                  <Text style={styles.cameraIcon}>📄</Text>
                  <Text style={[styles.imagePickerText, { fontSize: inputFontSize }]}>Upload License Back</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.buttonText, { fontSize: buttonFontSize }]}>Continue</Text>
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
  sectionLabel: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  imageSectionContainer: {
    marginBottom: 20,
  },
  imagePickerContainer: {
    marginBottom: 10,
  },
  imagePicker: {
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  cameraIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  imagePickerText: {
    color: '#666',
  },
  imageSelected: {
    height: 100,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    fontSize: 32,
    color: '#fff',
  },
  imageSelectedText: {
    color: '#fff',
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
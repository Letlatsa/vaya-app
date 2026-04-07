import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function DriverSuccessScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  
  const logoSize = Math.min(width, height) * 0.15;
  const titleFontSize = Math.min(width, height) * 0.045;
  const subtitleFontSize = Math.min(width, height) * 0.025;
  const buttonFontSize = Math.min(width, height) * 0.02;
  const paddingHorizontal = width * 0.08;

  const handleLoginAsClient = () => {
    router.replace('/login');
  };

  return (
    <View style={[styles.container, { paddingHorizontal }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.successIcon}>✓</Text>
        </View>
        
        <Image
          source={require('@/assets/images/Logo.jpeg')}
          style={[styles.logo, { width: logoSize, height: logoSize }]}
          resizeMode="contain"
        />
        
        <Text style={[styles.title, { fontSize: titleFontSize }]}>Application Submitted!</Text>
        
        <Text style={[styles.message, { fontSize: subtitleFontSize }]}>
          You have successfully submitted your application to become a driver. You will be contacted by our team for vehicle inspection.
        </Text>
        
        <TouchableOpacity
          style={styles.button}
          onPress={handleLoginAsClient}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, { fontSize: buttonFontSize }]}>Log in as a Client</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  successIcon: {
    fontSize: 50,
    color: '#fff',
  },
  logo: {
    marginBottom: 20,
  },
  title: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  message: {
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  button: {
    backgroundColor: '#FF6B00',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
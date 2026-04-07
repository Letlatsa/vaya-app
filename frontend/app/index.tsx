import React, { useEffect, useRef, useState, useContext } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Image, useWindowDimensions, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { UserContext } from './_layout';
import authStorage from '@/utils/authStorage';
import api from '@/constants/apiConfig';

export default function SplashScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { isLoggedIn, isLoading } = useContext(UserContext);
  
  // Responsive sizes based on screen dimensions
  const logoSize = Math.min(width, height) * 0.25;
  const fontSize = Math.min(width, height) * 0.05;
  const buttonFontSize = Math.min(width, height) * 0.018;
  const skipFontSize = Math.min(width, height) * 0.035;
  const paddingHorizontal = width * 0.08;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [showButtons, setShowButtons] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    checkSessionAndRedirect();
  }, [isLoggedIn, isLoading]);

  const checkSessionAndRedirect = async () => {
    if (isLoading) {
      return;
    }

    setIsCheckingSession(false);
    
    if (isLoggedIn) {
      router.replace('/(tabs)');
      return;
    }

    // Animate the logo and text
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Show buttons after 2 seconds
    const timer = setTimeout(() => {
      setShowButtons(true);
    }, 2000);

    return () => clearTimeout(timer);
  };

  const navigateToLogin = () => {
    router.replace('/login');
  };

  const navigateToRegister = () => {
    router.replace('/register');
  };

  // Show loading while checking session
  if (isCheckingSession) {
    return (
      <View style={[styles.container, { paddingHorizontal }]}>
        <Image
          source={require('@/assets/images/Logo.jpeg')}
          style={[styles.logo, { width: logoSize, height: logoSize }]}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingHorizontal }]}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Vaya Logo */}
        <Image
          source={require('@/assets/images/Logo.jpeg')}
          style={[styles.logo, { width: logoSize, height: logoSize }]}
          resizeMode="contain"
        />
        <Text style={[styles.tagline, { fontSize }]}>Your Ride, Your Way</Text>
      </Animated.View>

      {/* Login and Register Buttons */}
      {showButtons && (
        <Animated.View style={[styles.buttonContainer, { opacity: fadeAnim }]}>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={navigateToLogin}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { fontSize: buttonFontSize }]}>Log In</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.registerButton}
            onPress={navigateToRegister}
            activeOpacity={0.8}
          >
            <Text style={[styles.registerButtonText, { fontSize: buttonFontSize }]}>Sign Up</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Loading indicator (shown before buttons) */}
      {!showButtons && (
        <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
          <View style={styles.loadingDot} />
          <View style={[styles.loadingDot, styles.loadingDotMiddle]} />
          <View style={styles.loadingDot} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    position: 'absolute',
    top: '30%',
  },
  logo: {
    marginBottom: 10,
  },
  tagline: {
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 10,
    fontWeight: '500',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: '15%',
    width: '100%',
    paddingHorizontal: 20,
    gap: 12,
  },
  loginButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FF6B00',
    fontWeight: 'bold',
  },
  registerButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: '15%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 5,
  },
  loadingDotMiddle: {
    backgroundColor: '#fff',
  },
});

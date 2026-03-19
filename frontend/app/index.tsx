import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Image, useWindowDimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';

export default function SplashScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  
  // Responsive sizes based on screen dimensions
  const logoSize = Math.min(width, height) * 0.3; // 30% of smaller dimension
  const fontSize = Math.min(width, height) * 0.05;
  const skipFontSize = Math.min(width, height) * 0.035;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const navigateToRegister = () => {
    router.replace('/register');
  };

  useEffect(() => {
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

    // Navigate to register after 2.5 seconds
    const timer = setTimeout(() => {
      router.replace('/register');
    }, 2500);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, router]);

  return (
    <TouchableOpacity 
      style={[styles.container, { paddingHorizontal: width * 0.05 }]} 
      onPress={navigateToRegister} 
      activeOpacity={0.9}
    >
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

      {/* Loading indicator */}
      <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim, bottom: height * 0.15 }]}>
        <View style={styles.loadingDot} />
        <View style={[styles.loadingDot, styles.loadingDotMiddle]} />
        <View style={styles.loadingDot} />
      </Animated.View>

      {/* Skip hint */}
      <Animated.Text style={[styles.skipText, { opacity: fadeAnim, fontSize: skipFontSize, bottom: height * 0.08 }]}>
        Tap anywhere to skip
      </Animated.Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF6B00', // Vaya brand color
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    marginBottom: 10,
  },
  tagline: {
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 10,
    fontWeight: '500',
  },
  loadingContainer: {
    position: 'absolute',
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
  skipText: {
    position: 'absolute',
    color: 'rgba(255, 255, 255, 0.6)',
  },
});

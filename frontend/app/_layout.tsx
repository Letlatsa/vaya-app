import React, { useState, useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import authStorage from '@/utils/authStorage';
import api from '@/constants/apiConfig';

// User data type
type UserDataType = {
  _id?: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  totalRides: number;
  starRating: number;
  balance: number;
  profilePicture: string | null;
};

// Default user for logged out state
const DEFAULT_USER: UserDataType = {
  name: 'Guest User',
  totalRides: 0,
  starRating: 0,
  balance: 0,
  profilePicture: null,
};

export const UserContext = React.createContext<{
  userData: UserDataType;
  updateUserData: (data: Partial<UserDataType>) => void;
  logout: () => void;
  isLoggedIn: boolean;
  isLoading: boolean;
}>({
  userData: DEFAULT_USER,
  updateUserData: (data) => {},
  logout: () => {},
  isLoggedIn: false,
  isLoading: true,
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isLoading, setIsLoading] = useState(true);
  
  const [userData, setUserData] = useState<UserDataType>(DEFAULT_USER);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const token = await authStorage.getToken();
      
      if (token) {
        // Validate token with backend
        try {
          const response = await api.post('/api/users/validate-token', {}, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          if (response.data.success) {
            // Token is valid, restore user data
            setUserData({
              _id: response.data.data._id,
              name: response.data.data.name,
              email: response.data.data.email,
              phoneNumber: response.data.data.phoneNumber,
              balance: response.data.data.balance || 0,
              totalRides: response.data.data.totalRides || 0,
              starRating: response.data.data.starRating || 0,
              profilePicture: response.data.data.profilePicture || null,
            });
            console.log('✅ Session restored for:', response.data.data.name);
          }
        } catch (error: any) {
          // Token invalid or expired, clear session
          console.log('Session expired, clearing...');
          await authStorage.clearSession();
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserData = async (data: Partial<UserDataType>) => {
    setUserData(prev => {
      const updated = { ...prev, ...data };
      // Also save to AsyncStorage
      authStorage.setUserData(updated);
      return updated;
    });
  };

  const logout = async () => {
    try {
      // Clear stored token and data
      await authStorage.clearSession();
      
      // Reset user data to default
      setUserData(DEFAULT_USER);
      
      console.log('✅ User logged out');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const isLoggedIn = !!userData._id;

  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserContext.Provider value={{ userData, updateUserData, logout, isLoggedIn, isLoading }}>
        {/* @ts-ignore - Type issue with react-navigation/native */}
        <ThemeProvider value={theme}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ headerShown: false }} />
            <Stack.Screen name="verify-otp" options={{ headerShown: false }} />
            <Stack.Screen name="profile" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="driver-register" options={{ headerShown: false }} />
            <Stack.Screen name="driver-license" options={{ headerShown: false }} />
            <Stack.Screen name="driver-car" options={{ headerShown: false }} />
            <Stack.Screen name="driver-success" options={{ headerShown: false }} />
            <Stack.Screen name="driver-map" options={{ headerShown: false }} />
          </Stack>
        </ThemeProvider>
        <StatusBar style="auto" />
      </UserContext.Provider>
    </GestureHandlerRootView>
  );
}
import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { UserContext } from './_layout';

const API_URL = 'http://localhost:5000/api/users';

// User type definition
type UserData = {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  profilePicture: string | null;
  balance: number;
  totalRides: number;
  starRating: number;
};

// Default user for initial state
const DEFAULT_USER: UserData = {
  _id: '',
  name: 'Loading...',
  email: '',
  phoneNumber: '',
  profilePicture: null,
  balance: 0,
  totalRides: 0,
  starRating: 0,
};

export default function ProfileScreen() {
  const { userData: contextUserData, logout: logoutContext } = useContext(UserContext);
  const params = useLocalSearchParams<{ userId?: string }>();
  const router = useRouter();
  const [user, setUser] = useState<UserData>(DEFAULT_USER);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user data from API
  const fetchUserData = async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axios.get(`${API_URL}/${userId}`);
      
      if (response.data.success) {
        setUser(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch user data');
        Alert.alert('Error', response.data.message || 'Failed to fetch user data');
      }
    } catch (err: any) {
      console.error('Error fetching user data:', err);
      const errorMessage = err.response?.data?.message || 'Failed to connect to server. Please check if the backend is running.';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Use context user data if available, otherwise fetch from API
  useEffect(() => {
    // If context has user data, use it directly
    if (contextUserData?._id) {
      setUser({
        _id: contextUserData._id,
        name: contextUserData.name,
        email: contextUserData.email || '',
        phoneNumber: contextUserData.phoneNumber || '',
        profilePicture: contextUserData.profilePicture,
        balance: contextUserData.balance,
        totalRides: contextUserData.totalRides,
        starRating: contextUserData.starRating,
      });
      setIsLoading(false);
    } else {
      // Fallback: try to fetch from API
      const userId = params.userId || contextUserData?._id || '69c1223ddb2c446f4712c5b9';
      if (userId) {
        fetchUserData(userId);
      } else {
        setError('No user data available. Please log in.');
        setIsLoading(false);
      }
    }
  }, [contextUserData, params.userId]);

  // Request permissions for image picker
  useEffect(() => {
    const requestPermissions = async () => {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Please grant camera and photo library permissions to update your profile picture.'
        );
      }
    };
    
    requestPermissions();
  }, []);

  const pickImage = async () => {
    setIsLoading(true);
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await updateProfilePicture(base64Image);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfilePicture = async (base64Image: string) => {
    setIsUpdating(true);
    
    try {
      // In a real app, you would get the userId from auth context
      const response = await axios.patch(`${API_URL}/profile-picture`, {
        userId: user._id,
        profilePicture: base64Image,
      });

      if (response.data.success) {
        setUser(prev => ({
          ...prev,
          profilePicture: base64Image,
        }));
        Alert.alert('Success', 'Profile picture updated successfully!');
      } else {
        Alert.alert('Error', response.data.message || 'Failed to update profile picture');
      }
    } catch (error) {
      console.error('Error updating profile picture:', error);
      // For demo purposes, we'll still update locally even if API fails
      setUser(prev => ({
        ...prev,
        profilePicture: base64Image,
      }));
      Alert.alert('Success', 'Profile picture updated! (Local only - API not connected)');
    } finally {
      setIsUpdating(false);
    }
  };

  // Default avatar
  const defaultAvatar = 'https://ui-avatars.com/api/?name=User&background=FF6B00&color=fff&size=128';

  // Show loading indicator while fetching data
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error && !user._id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              const userId = params.userId || contextUserData?._id || '69c1223ddb2c446f4712c5b9';
              fetchUserData(userId);
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Profile Picture Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: user.profilePicture || defaultAvatar }}
              style={styles.avatar}
            />
            <TouchableOpacity 
              style={styles.editButton} 
              onPress={pickImage}
              disabled={isLoading || isUpdating}
            >
              {isLoading || isUpdating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.editButtonText}>✎</Text>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.status}>
            {user.totalRides === 0 
              ? 'Newbie' 
              : `⭐ ${user.starRating?.toFixed(1) || '0.0'} • ${user.totalRides || 0} rides`}
          </Text>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Wallet Balance</Text>
          <Text style={styles.balanceAmount}>R {(user.balance || 0).toFixed(2)}</Text>
        </View>

        {/* User Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{user.name}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{user.phoneNumber}</Text>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>Notification Preferences</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>Payment Methods</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>Privacy & Security</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>Help & Support</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            Alert.alert(
              'Log Out',
              'Are you sure you want to log out?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Log Out',
                  style: 'destructive',
                  onPress: () => {
                    logoutContext();
                    router.replace('/login');
                  },
                },
              ]
            );
          }}
        >
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    padding: 20,
    backgroundColor: '#FF6B00',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FF6B00',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  status: {
    fontSize: 14,
    color: '#666',
  },
  balanceCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  infoSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    maxWidth: '60%',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
  },
  settingsSection: {
    padding: 16,
  },
  settingItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  settingText: {
    fontSize: 14,
    color: '#333',
  },
  settingArrow: {
    fontSize: 20,
    color: '#999',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    marginHorizontal: 16,
    marginVertical: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useContext } from 'react';
import { UserContext } from '@/app/_layout';

interface CustomDrawerContentProps {
  state?: any;
  navigation?: any;
  descriptors?: any;
}

export default function CustomDrawerContent(props: CustomDrawerContentProps) {
  const { userData, logout } = useContext(UserContext);
  const router = useRouter();

  const navigateToProfile = () => router.push('/profile' as any);
  const navigateToHome = () => router.replace('/(tabs)' as any);
  const navigateToMyRides = () => router.push('/(tabs)/explore' as any);
  const navigateToLocation = (label: string) => {
    router.replace(`/(tabs)?location=${encodeURIComponent(label)}&target=pickup` as any);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login' as any);
  };
  
  // Determine status based on rides
  const getStatus = () => {
    if (!userData || userData.totalRides === 0) {
      return 'Newbie';
    }
    return `⭐ ${userData.starRating.toFixed(1)}`;
  };

  // Default avatar if no profile picture
  const defaultAvatar = 'https://ui-avatars.com/api/?name=User&background=FF6B00&color=fff&size=128';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={navigateToProfile} style={styles.headerTouchable}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: userData?.profilePicture || defaultAvatar }}
                style={styles.avatar}
              />
            </View>
            <Text style={styles.userName}>{userData?.name || 'User'}</Text>
            <Text style={styles.status}>{getStatus()}</Text>
          </TouchableOpacity>
        </View>

        {/* Balance Section */}
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Wallet Balance</Text>
          <Text style={styles.balanceAmount}>
            R {userData?.balance?.toFixed(2) || '0.00'}
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Menu Items - Using TouchableOpacity for navigation */}
        <View style={styles.menuItems}>
          <TouchableOpacity style={styles.menuItem} onPress={navigateToHome}>
            <Text style={styles.menuIcon}>🏠</Text>
            <Text style={styles.menuText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={navigateToMyRides}>
            <Text style={styles.menuIcon}>🚗</Text>
            <Text style={styles.menuText}>My Rides</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={navigateToProfile}>
            <Text style={styles.menuIcon}>👤</Text>
            <Text style={styles.menuText}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>⚙️</Text>
            <Text style={styles.menuText}>Settings</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.savedHeader}>
          <Text style={styles.savedTitle}>Saved locations</Text>
        </View>
        <View style={styles.savedLocations}>
          <TouchableOpacity style={styles.savedItem} onPress={() => navigateToLocation('Home')}>
            <View style={styles.savedIcon}><Text>🏡</Text></View>
            <View style={styles.savedTextWrap}>
              <Text style={styles.savedLabel}>Home</Text>
              <Text style={styles.savedAddress}>Your home address</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.savedItem} onPress={() => navigateToLocation('Office')}>
            <View style={styles.savedIcon}><Text>🏢</Text></View>
            <View style={styles.savedTextWrap}>
              <Text style={styles.savedLabel}>Office</Text>
              <Text style={styles.savedAddress}>Work or office location</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerItem}>
          <Text style={styles.footerText}>Help & Support</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerItem} onPress={() => router.push('/driver-register' as any)}>
          <Text style={styles.footerText}>🚙 Become a Driver</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerItem} onPress={handleLogout}>
          <Text style={[styles.footerText, { color: '#f44336' }]}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingTop: 0,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FF6B00',
    marginBottom: 10,
  },
  headerTouchable: {
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  status: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  balanceContainer: {
    padding: 16,
    marginHorizontal: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 10,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  menuItems: {
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  menuText: {
    fontSize: 15,
    color: '#333',
  },
  savedHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  savedTitle: {
    fontSize: 12,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  savedLocations: {
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  savedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#f7f7f7',
    marginBottom: 10,
  },
  savedIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#ececec',
  },
  savedTextWrap: {
    flex: 1,
  },
  savedLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  savedAddress: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  footerItem: {
    paddingVertical: 12,
  },
  footerText: {
    fontSize: 14,
    color: '#333',
  },
});

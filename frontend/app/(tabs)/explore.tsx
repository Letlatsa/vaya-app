import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  useWindowDimensions,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';

export default function ExploreScreen() {
  const { width, height } = useWindowDimensions();
  const navigation = useNavigation();
  
  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };
  
  // Responsive sizes
  const logoSize = Math.min(width, height) * 0.12;
  const labelFontSize = Math.min(width, height) * 0.018;
  const paddingHorizontal = width * 0.06;
  const cardWidth = width - paddingHorizontal * 2;
  const marginHorizontal = width * 0.05;

  const menuItems = [
    { icon: '👤', label: 'Edit Profile', arrow: '›' },
    { icon: '📍', label: 'Saved Addresses', arrow: '›' },
    { icon: '💳', label: 'Payment Methods', arrow: '›' },
    { icon: '🔔', label: 'Notifications', arrow: '›' },
    { icon: '🛡️', label: 'Safety', arrow: '›' },
    { icon: '❓', label: 'Help Center', arrow: '›' },
    { icon: '📜', label: 'Terms & Privacy', arrow: '›' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
            <Text style={styles.drawerMenuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitleText}>My Rides</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { paddingHorizontal, marginHorizontal }]}>
          <View style={styles.profileInfo}>
            <Image
              source={require('@/assets/images/Logo.jpeg')}
              style={[styles.profileLogo, { width: logoSize, height: logoSize }]}
              resizeMode="contain"
            />
            <View style={styles.profileText}>
              <Text style={[styles.userName, { fontSize: labelFontSize * 1.3 }]}>Guest User</Text>
              <Text style={[styles.userPhone, { fontSize: labelFontSize }]}>+27 000 000 000</Text>
            </View>
          </View>
          <Text style={styles.arrow}>›</Text>
        </View>

        {/* Wallet Section */}
        <View style={[styles.section, { paddingHorizontal }]}>
          <View style={styles.walletCard}>
            <View style={styles.walletInfo}>
              <Text style={styles.walletLabel}>Vaya Wallet</Text>
              <Text style={[styles.walletBalance, { fontSize: labelFontSize * 1.5 }]}>R 0.00</Text>
            </View>
            <TouchableOpacity style={styles.addMoneyButton}>
              <Text style={styles.addMoneyText}>Add Money</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Items */}
        <View style={[styles.menuSection, { paddingHorizontal }]}>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={[styles.menuLabel, { fontSize: labelFontSize }]}>{item.label}</Text>
              </View>
              <Text style={styles.menuArrow}>{item.arrow}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Version */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { fontSize: labelFontSize * 0.85 }]}>
            Vaya App v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FF6B00',
  },
  menuButton: {
    padding: 8,
  },
  drawerMenuIcon: {
    fontSize: 24,
    color: '#fff',
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginTop: -20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileLogo: {
    borderRadius: 30,
    marginRight: 12,
  },
  profileText: {
    justifyContent: 'center',
  },
  userName: {
    fontWeight: '600',
    color: '#333',
  },
  userPhone: {
    color: '#666',
    marginTop: 2,
  },
  arrow: {
    fontSize: 24,
    color: '#999',
  },
  section: {
    marginTop: 20,
  },
  walletCard: {
    backgroundColor: '#FF6B00',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletInfo: {
    flex: 1,
  },
  walletLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  walletBalance: {
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 5,
  },
  addMoneyButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addMoneyText: {
    color: '#FF6B00',
    fontWeight: '600',
    fontSize: 14,
  },
  menuSection: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuLabel: {
    color: '#333',
  },
  menuArrow: {
    fontSize: 20,
    color: '#999',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  versionText: {
    color: '#999',
  },
});

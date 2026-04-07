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
import { Link, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const navigation = useNavigation();
  
  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };
  
  // Responsive sizes
  const logoSize = Math.min(width, height) * 0.15;
  const titleFontSize = Math.min(width, height) * 0.06;
  const subtitleFontSize = Math.min(width, height) * 0.025;
  const buttonFontSize = Math.min(width, height) * 0.018;
  const paddingHorizontal = width * 0.06;
  const cardWidth = (width - paddingHorizontal * 2 - 12) / 2;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Menu Button */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
          <Text style={styles.drawerMenuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vaya</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header with Logo */}
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/Logo.jpeg')}
            style={[styles.logo, { width: logoSize, height: logoSize }]}
            resizeMode="contain"
          />
          <Text style={[styles.title, { fontSize: titleFontSize }]}>VAYA</Text>
          <Text style={[styles.subtitle, { fontSize: subtitleFontSize }]}>Your Ride, Your Way</Text>
        </View>

        {/* Quick Actions */}
        <View style={[styles.quickActions, { paddingHorizontal }]}>
          <Text style={[styles.sectionTitle, { fontSize: subtitleFontSize }]}>Quick Actions</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.actionButton, { width: cardWidth }]}>
              <Text style={styles.actionIcon}>🚗</Text>
              <Text style={[styles.actionText, { fontSize: buttonFontSize }]}>Book a Ride</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { width: cardWidth }]}>
              <Text style={styles.actionIcon}>📍</Text>
              <Text style={[styles.actionText, { fontSize: buttonFontSize }]}>Where to?</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.actionButton, { width: cardWidth }]}>
              <Text style={styles.actionIcon}>📅</Text>
              <Text style={[styles.actionText, { fontSize: buttonFontSize }]}>Schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { width: cardWidth }]}>
              <Text style={styles.actionIcon}>🧾</Text>
              <Text style={[styles.actionText, { fontSize: buttonFontSize }]}>Trips</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Trips Section */}
        <View style={[styles.recentSection, { paddingHorizontal }]}>
          <Text style={[styles.sectionTitle, { fontSize: subtitleFontSize }]}>Recent Activity</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🚙</Text>
            <Text style={[styles.emptyText, { fontSize: buttonFontSize }]}>No recent trips</Text>
            <Text style={[styles.emptySubtext, { fontSize: buttonFontSize * 0.85 }]}>
              Your trip history will appear here
            </Text>
          </View>
        </View>

        {/* Promotions */}
        <View style={[styles.promoSection, { paddingHorizontal }]}>
          <View style={styles.promoCard}>
            <Text style={[styles.promoTitle, { fontSize: buttonFontSize }]}>Get R50 off your first ride!</Text>
            <Text style={[styles.promoSubtext, { fontSize: buttonFontSize * 0.85 }]}>
              Use code: VAYA50
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#FF6B00',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  logo: {
    marginBottom: 10,
  },
  title: {
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 5,
  },
  quickActions: {
    marginTop: 20,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionText: {
    color: '#333',
    fontWeight: '500',
  },
  recentSection: {
    marginTop: 20,
  },
  emptyState: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyText: {
    color: '#666',
    fontWeight: '500',
  },
  emptySubtext: {
    color: '#999',
    marginTop: 5,
  },
  promoSection: {
    marginTop: 20,
  },
  promoCard: {
    backgroundColor: '#FF6B00',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  promoTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  promoSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 5,
  },
});

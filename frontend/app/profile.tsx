import React, { useContext, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { UserContext } from './_layout';
import api from '@/constants/apiConfig';

const ORANGE = '#FF6B00';
const DARK = '#1A1A2E';


const SETTINGS = [
  { icon: '🔔', label: 'Notification Preferences' },
  { icon: '💳', label: 'Payment Methods' },
  { icon: '🛡️', label: 'Privacy & Security' },
  { icon: '❓', label: 'Help & Support' },
  { icon: '🚙', label: 'Driver Dashboard' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { userData, updateUserData, logout } = useContext(UserContext);
  const [uploading, setUploading] = useState(false);

  const avatarUrl = userData.profilePicture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'U')}&background=FF6B00&color=fff&size=128`;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;

    const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
    setUploading(true);
    try {
      await api.patch('/api/users/profile-picture', {
        userId: userData._id,
        profilePicture: base64Image,
      });
      updateUserData({ profilePicture: base64Image });
    } catch {
      // Update locally even if API fails
      updateUserData({ profilePicture: base64Image });
    } finally {
      setUploading(false);
    }
  };

  const handleSettingPress = (label: string) => {
    if (label === 'Driver Dashboard') router.push('/driver-map' as any);
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => { await logout(); router.replace('/login' as any); },
      },
    ]);
  };

  const ratingLabel = userData.totalRides === 0
    ? 'New Rider'
    : `⭐ ${(userData.starRating || 0).toFixed(1)} · ${userData.totalRides} rides`;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Avatar + Name */}
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={pickImage} disabled={uploading} style={styles.avatarWrap}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            <View style={styles.editBadge}>
              {uploading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.editBadgeText}>✎</Text>
              }
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>{userData.name}</Text>
          <Text style={styles.ratingLabel}>{ratingLabel}</Text>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View>
            <Text style={styles.balanceLabel}>Wallet Balance</Text>
            <Text style={styles.balanceAmount}>M {(userData.balance || 0).toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={styles.topUpBtn}>
            <Text style={styles.topUpText}>Top Up</Text>
          </TouchableOpacity>
        </View>

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.infoCard}>
            {[
              { label: 'Full Name', value: userData.name },
              { label: 'Email', value: userData.email || '—' },
              { label: 'Phone', value: userData.phoneNumber || '—' },
            ].map((row, i, arr) => (
              <View key={row.label}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{row.value}</Text>
                </View>
                {i < arr.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          {SETTINGS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.settingRow}
              onPress={() => handleSettingPress(item.label)}
              activeOpacity={0.7}
            >
             <Text style={styles.settingIcon}>{item.icon}</Text>
              <Text style={styles.settingLabel}>{item.label}</Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  scroll: { paddingBottom: 40 },

  header: {
    backgroundColor: ORANGE, paddingVertical: 18, paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },

  profileSection: {
    alignItems: 'center', backgroundColor: '#fff',
    paddingVertical: 28, marginBottom: 12,
  },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, borderColor: ORANGE,
  },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: ORANGE, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  editBadgeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  userName: { fontSize: 22, fontWeight: '800', color: DARK, marginBottom: 4 },
  ratingLabel: { fontSize: 14, color: '#888' },

  balanceCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: DARK, marginHorizontal: 16, borderRadius: 16,
    padding: 20, marginBottom: 12,
  },
  balanceLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
  balanceAmount: { fontSize: 26, fontWeight: '800', color: '#fff' },
  topUpBtn: {
    backgroundColor: ORANGE, borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  topUpText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  section: { paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: '#999',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 10, marginLeft: 4,
  },

  infoCard: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 14,
  },
  infoLabel: { fontSize: 14, color: '#888' },
  infoValue: { fontSize: 14, fontWeight: '600', color: DARK, maxWidth: '55%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#f0f0f0' },

  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 15, marginBottom: 8,
  },
  settingIcon: { fontSize: 18, marginRight: 14 },
  settingLabel: { flex: 1, fontSize: 14, color: DARK, fontWeight: '500' },
  settingArrow: { fontSize: 20, color: '#ccc' },

  logoutBtn: {
    marginHorizontal: 16, marginTop: 8, backgroundColor: '#FEE2E2',
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },
});

import React, { useEffect, useRef, useContext } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  Image, ScrollView, Dimensions, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { UserContext } from './_layout';

const { width: W, height: H } = Dimensions.get('window');
const ORANGE = '#FF6B00';
const DARK   = '#1A1A2E';

const FEATURES = [
  { icon: '🚖', title: 'Instant Booking',   desc: 'Book a ride in seconds, get picked up in minutes.' },
  { icon: '📍', title: 'Live Tracking',      desc: 'Track your driver in real-time on the map.' },
  { icon: '💳', title: 'Easy Payments',      desc: 'Pay securely with your wallet or cash.' },
  { icon: '⭐', title: 'Rated Drivers',      desc: 'Every driver is verified and community-rated.' },
];

const STEPS = [
  { num: '01', title: 'Set your pickup',     desc: 'Drop a pin or let us detect your location.' },
  { num: '02', title: 'Choose your ride',    desc: 'Pick Standard, Comfort or XL.' },
  { num: '03', title: 'Confirm & relax',     desc: 'A driver accepts and heads your way.' },
];

export default function LandingPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useContext(UserContext);

  // Animations
  const heroFade  = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(40)).current;
  const btnFade   = useRef(new Animated.Value(0)).current;
  const btnSlide  = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (isLoading) return;
    if (isLoggedIn) { router.replace('/(tabs)'); return; }

    Animated.sequence([
      Animated.parallel([
        Animated.timing(heroFade,  { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(heroSlide, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(btnFade,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(btnSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, [isLoading, isLoggedIn]);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <Image source={require('@/assets/images/Logo.jpeg')} style={styles.loaderLogo} resizeMode="contain" />
        <ActivityIndicator size="large" color={ORANGE} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

      {/* ── Hero ── */}
      <View style={styles.hero}>
        {/* Background circles */}
        <View style={[styles.circle, { width: 500, height: 500, top: -180, right: -160, opacity: 0.08 }]} />
        <View style={[styles.circle, { width: 300, height: 300, top: 60,   right: -80,  opacity: 0.06 }]} />
        <View style={[styles.circle, { width: 200, height: 200, bottom: 20, left: -60,  opacity: 0.05 }]} />

        {/* Nav bar */}
        <View style={styles.nav}>
          <View style={styles.navBrand}>
            <Image source={require('@/assets/images/Logo.jpeg')} style={styles.navLogo} resizeMode="contain" />
            <Text style={styles.navTitle}>VAYA</Text>
          </View>
          <TouchableOpacity style={styles.navLoginBtn} onPress={() => router.push('/login' as any)}>
            <Text style={styles.navLoginText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Hero content */}
        <Animated.View style={[styles.heroContent, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>🚀  Now available in Lesotho</Text>
          </View>
          <Text style={styles.heroTitle}>Your Ride,{'\n'}Your Way.</Text>
          <Text style={styles.heroSub}>
            Fast, safe and affordable rides at your fingertips.{'\n'}
            Book in seconds, track in real-time.
          </Text>

          <Animated.View style={[styles.heroBtns, { opacity: btnFade, transform: [{ translateY: btnSlide }] }]}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/register' as any)} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Get Started  →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/login' as any)} activeOpacity={0.85}>
              <Text style={styles.secondaryBtnText}>Sign In</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {[['500+', 'Rides Done'], ['50+', 'Drivers'], ['4.8★', 'Rating']].map(([val, label]) => (
              <View key={label} style={styles.statItem}>
                <Text style={styles.statVal}>{val}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Hero car emoji */}
        <Animated.View style={[styles.heroEmoji, { opacity: heroFade }]}>
          <Text style={styles.heroEmojiText}>🚖</Text>
        </Animated.View>
      </View>

      {/* ── Features ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTag}>WHY VAYA</Text>
        <Text style={styles.sectionTitle}>Everything you need{'\n'}in one ride app</Text>
        <View style={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
              </View>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── How it works ── */}
      <View style={[styles.section, styles.sectionDark]}>
        <Text style={[styles.sectionTag, { color: 'rgba(255,255,255,0.5)' }]}>HOW IT WORKS</Text>
        <Text style={[styles.sectionTitle, { color: '#fff' }]}>Ride in 3 simple steps</Text>
        <View style={styles.stepsCol}>
          {STEPS.map((s, i) => (
            <View key={s.num} style={styles.stepRow}>
              <View style={styles.stepNumWrap}>
                <Text style={styles.stepNum}>{s.num}</Text>
                {i < STEPS.length - 1 && <View style={styles.stepLine} />}
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepDesc}>{s.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ── Driver CTA ── */}
      <View style={styles.section}>
        <View style={styles.driverCta}>
          <View style={styles.driverCtaLeft}>
            <Text style={styles.driverCtaTag}>FOR DRIVERS</Text>
            <Text style={styles.driverCtaTitle}>Earn on your{'\n'}own schedule</Text>
            <Text style={styles.driverCtaDesc}>Join hundreds of drivers making money with Vaya. Set your own hours, accept rides you want.</Text>
            <TouchableOpacity
              style={styles.driverCtaBtn}
              onPress={() => router.push('/driver-register' as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.driverCtaBtnText}>Become a Driver  →</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.driverCtaEmoji}>🚗</Text>
        </View>
      </View>

      {/* ── Final CTA ── */}
      <View style={styles.finalCta}>
        <View style={[styles.circle, { width: 400, height: 400, top: -150, left: -100, opacity: 0.08 }]} />
        <Text style={styles.finalCtaTitle}>Ready to ride?</Text>
        <Text style={styles.finalCtaSub}>Join Vaya today and experience the difference.</Text>
        <TouchableOpacity style={styles.finalCtaBtn} onPress={() => router.push('/register' as any)} activeOpacity={0.85}>
          <Text style={styles.finalCtaBtnText}>Create Free Account</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/login' as any)}>
          <Text style={styles.finalCtaLogin}>Already have an account? <Text style={{ fontWeight: '800' }}>Sign In</Text></Text>
        </TouchableOpacity>
      </View>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <View style={styles.footerBrand}>
          <Image source={require('@/assets/images/Logo.jpeg')} style={styles.footerLogo} resizeMode="contain" />
          <Text style={styles.footerBrandName}>VAYA</Text>
        </View>
        <Text style={styles.footerText}>© {new Date().getFullYear()} Vaya Rides. All rights reserved.</Text>
        <Text style={styles.footerText}>Lesotho's premier ride-hailing service.</Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1 },
  loader: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  loaderLogo: { width: 100, height: 100, borderRadius: 20 },

  // Hero
  hero: {
    backgroundColor: DARK,
    minHeight: H * 0.85,
    paddingBottom: 60,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: Platform.OS === 'web' ? 24 : 52, paddingBottom: 16,
  },
  navBrand:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navLogo:      { width: 36, height: 36, borderRadius: 10 },
  navTitle:     { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 3 },
  navLoginBtn:  { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  navLoginText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  heroContent: { paddingHorizontal: 24, paddingTop: 40, maxWidth: 600, alignSelf: 'center', width: '100%' },
  heroBadge:   { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: 'rgba(255,107,0,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,107,0,0.3)' },
  heroBadgeText: { color: ORANGE, fontSize: 13, fontWeight: '600' },
  heroTitle:   { fontSize: Platform.OS === 'web' ? 56 : 42, fontWeight: '900', color: '#fff', lineHeight: Platform.OS === 'web' ? 66 : 50, marginBottom: 20 },
  heroSub:     { fontSize: 16, color: 'rgba(255,255,255,0.65)', lineHeight: 26, marginBottom: 36 },

  heroBtns:       { flexDirection: 'row', gap: 12, marginBottom: 48, flexWrap: 'wrap' },
  primaryBtn:     { backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 28, shadowColor: ORANGE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondaryBtn:   { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 28 },
  secondaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  statsRow:  { flexDirection: 'row', gap: 32 },
  statItem:  {},
  statVal:   { fontSize: 24, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2, fontWeight: '500' },

  heroEmoji:     { position: 'absolute', bottom: 24, right: 24, opacity: 0.15 },
  heroEmojiText: { fontSize: 120 },

  // Sections
  section:     { paddingHorizontal: 24, paddingVertical: 64, maxWidth: 700, alignSelf: 'center', width: '100%' },
  sectionDark: { backgroundColor: DARK, maxWidth: '100%', width: '100%', paddingHorizontal: 24 },
  sectionTag:  { fontSize: 11, fontWeight: '800', color: ORANGE, letterSpacing: 2, marginBottom: 12 },
  sectionTitle: { fontSize: Platform.OS === 'web' ? 36 : 28, fontWeight: '900', color: '#1a1a1a', lineHeight: Platform.OS === 'web' ? 44 : 36, marginBottom: 40 },

  // Features
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  featureCard:  { width: Platform.OS === 'web' ? '47%' : '100%', backgroundColor: '#f7f8fc', borderRadius: 20, padding: 24 },
  featureIconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#FFF3EB', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  featureIcon:  { fontSize: 24 },
  featureTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  featureDesc:  { fontSize: 14, color: '#888', lineHeight: 22 },

  // Steps
  stepsCol:    { gap: 0 },
  stepRow:     { flexDirection: 'row', gap: 20, maxWidth: 500 },
  stepNumWrap: { alignItems: 'center', width: 48 },
  stepNum:     { width: 48, height: 48, borderRadius: 24, backgroundColor: ORANGE, textAlign: 'center', textAlignVertical: 'center', lineHeight: 48, fontSize: 14, fontWeight: '900', color: '#fff', overflow: 'hidden' },
  stepLine:    { width: 2, flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 4, minHeight: 32 },
  stepContent: { flex: 1, paddingBottom: 36 },
  stepTitle:   { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 6 },
  stepDesc:    { fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 22 },

  // Driver CTA
  driverCta:      { backgroundColor: '#FFF3EB', borderRadius: 24, padding: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  driverCtaLeft:  { flex: 1 },
  driverCtaTag:   { fontSize: 11, fontWeight: '800', color: ORANGE, letterSpacing: 2, marginBottom: 10 },
  driverCtaTitle: { fontSize: 28, fontWeight: '900', color: '#1a1a1a', lineHeight: 36, marginBottom: 12 },
  driverCtaDesc:  { fontSize: 14, color: '#666', lineHeight: 22, marginBottom: 24 },
  driverCtaBtn:   { backgroundColor: DARK, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, alignSelf: 'flex-start' },
  driverCtaBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  driverCtaEmoji: { fontSize: 72, marginLeft: 16 },

  // Final CTA
  finalCta:       { backgroundColor: ORANGE, paddingVertical: 80, paddingHorizontal: 24, alignItems: 'center', overflow: 'hidden' },
  finalCtaTitle:  { fontSize: Platform.OS === 'web' ? 44 : 32, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 12 },
  finalCtaSub:    { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 36, lineHeight: 24 },
  finalCtaBtn:    { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 4 },
  finalCtaBtnText: { color: ORANGE, fontWeight: '900', fontSize: 16 },
  finalCtaLogin:  { color: 'rgba(255,255,255,0.8)', fontSize: 14 },

  // Footer
  footer:          { backgroundColor: DARK, paddingVertical: 40, paddingHorizontal: 24, alignItems: 'center', gap: 8 },
  footerBrand:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  footerLogo:      { width: 32, height: 32, borderRadius: 8 },
  footerBrandName: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 3 },
  footerText:      { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
});

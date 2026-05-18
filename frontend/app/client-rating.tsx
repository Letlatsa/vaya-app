import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function ClientRatingScreen() {
  const { tripId } = useLocalSearchParams();
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Rate your driver</Text>
      <Text>Trip ID: {tripId}</Text>
    </SafeAreaView>
  );
}

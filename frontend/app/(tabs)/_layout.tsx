import React, { useContext } from 'react';
import { Drawer } from 'expo-router/drawer';
import { UserContext } from '../_layout';
import CustomDrawerContent from '@/components/CustomDrawerContent';

export default function TabLayout() {
  const { userData } = useContext(UserContext);

  return (
    <Drawer
      drawerContent={(props: any) => (
        <CustomDrawerContent {...props} userData={userData} />
      )}
      screenOptions={{
        headerShown: false,
        drawerStyle: { width: 280 },
        drawerActiveTintColor: '#FF6B00',
        drawerInactiveTintColor: '#333',
        drawerLabelStyle: { marginLeft: -20, fontSize: 15 },
      }}
    >
      <Drawer.Screen name="index" options={{ title: 'Home', drawerLabel: 'Home' }} />
      <Drawer.Screen name="explore" options={{ title: 'My Rides', drawerLabel: 'My Rides' }} />
    </Drawer>
  );
}

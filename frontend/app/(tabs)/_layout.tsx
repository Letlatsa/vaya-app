import React, { useContext } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { UserContext } from '../_layout';

import HomeScreen from './index';
import ExploreScreen from './explore';
import ProfileScreen from '../profile';
import CustomDrawerContent from '@/components/CustomDrawerContent';

const Drawer = createDrawerNavigator();

export default function TabLayout() {
  const { userData } = useContext(UserContext);

  return (
    // @ts-ignore - Type issues with react-navigation/drawer v7
    <Drawer.Navigator
      drawerContent={(props: any) => (
        <CustomDrawerContent {...props} userData={userData} />
      )}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          width: 280,
        },
        drawerActiveTintColor: '#FF6B00',
        drawerInactiveTintColor: '#333',
        drawerLabelStyle: {
          marginLeft: -20,
          fontSize: 15,
        },
      }}
    >
      {/* @ts-ignore */}
      <Drawer.Screen name="Home" component={HomeScreen} />
      {/* @ts-ignore */}
      <Drawer.Screen name="MyRides" component={ExploreScreen} />
      {/* @ts-ignore */}
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      {/* @ts-ignore */}
      <Drawer.Screen name="Settings" component={ExploreScreen} />
    </Drawer.Navigator>
  );
}

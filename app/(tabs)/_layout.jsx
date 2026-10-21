// app/(tabs)/_layout.jsx
// Bottom tab navigator — Home, History, Profile

import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f2318',
          borderTopColor: '#1a3a2a',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#4caf50',
        tabBarInactiveTintColor: '#555',
        tabBarLabel: ({ color }) => (
          <Text style={{ color, fontSize: 11, marginTop: -2 }}>
            {route.name === 'index' ? 'Home' : route.name.charAt(0).toUpperCase() + route.name.slice(1)}
          </Text>
        ),
        tabBarIcon: ({ color, size }) => {
          const icons = { index: '🏠', profile: '👤' };
          return <Text style={{ fontSize: size - 4 }}>{icons[route.name]}</Text>;
        },
      })}
    >
      <Tabs.Screen name="index"   options={{ title: 'Home' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

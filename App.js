//App.js - root of the SmartPlant AI app
//sets up navigation: auth stack (Login/Register) + main tab bar

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';

import { AuthProvider } from './src/context/AuthContext';

import HomeScreen    from './src/screens/HomeScreen';
import ResultScreen  from './src/screens/ResultScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen   from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

//bottom tab navigator (main app)
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f2318',
          borderTopColor: '#1a3a2a',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor:   '#4caf50',
        tabBarInactiveTintColor: '#555',
        tabBarLabel: ({ color }) => (
          <Text style={{ color, fontSize: 11, marginTop: -2 }}>
            {route.name}
          </Text>
        ),
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home:    '🏠',
            History: '📋',
            Profile: '👤',
          };
          return (
            <Text style={{ fontSize: size - 4 }}>{icons[route.name]}</Text>
          );
        },
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen}    />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

//root stack: auth screens + main tabs + result screen
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <Stack.Navigator
              initialRouteName="Login"
              screenOptions={{ headerShown: false }}
            >
              {/* Auth screens */}
              <Stack.Screen name="Login"    component={LoginScreen}    />
              <Stack.Screen name="Register" component={RegisterScreen} />

              {/* Main app */}
              <Stack.Screen name="MainTabs" component={MainTabs} />

              {/* Result screen (opened from Home or History) */}
              <Stack.Screen name="Result"   component={ResultScreen}   />
            </Stack.Navigator>
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
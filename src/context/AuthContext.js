
//AuthContext.js
//global auth state: token, user, login, logout
//wrap the app in <AuthProvider> to make auth available everywhere

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../utils/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'smartplant_auth_token';
const USER_KEY  = 'smartplant_auth_user';

export function AuthProvider({ children }) {
  const [token, setToken]     = useState(null);
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // true while restoring session

  //restore session on app start
  useEffect(() => {
    const restore = async () => {
      try {
        const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const savedUser  = await AsyncStorage.getItem(USER_KEY);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch (e) {
        console.error('Failed to restore auth session:', e);
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  //register a new account
  const register = async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Registration failed');
    await _saveSession(data.token, data.user);
    return data;
  };

  //log in to an existing account
  const login = async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Login failed');
    await _saveSession(data.token, data.user);
    return data;
  };

  //clear session
  const logout = async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    setToken(null);
    setUser(null);
  };

  //persist token + user to AsyncStorage and update state
  const _saveSession = async (newToken, newUser) => {
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

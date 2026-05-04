import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { auth } from '../../firebaseConfig';

const STORAGE_KEY = 'auth.currentUser';
const POLL_INTERVAL_MS = 5000;
const ADMIN_EMAIL = 'admin@gmail.com';

const AuthContext = createContext({
  user: null,
  loading: true,
  logout: async () => {}
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const userRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const loadFromStorage = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && isMounted && !userRef.current) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            setUser(parsed);
          }
        }
      } catch (error) {
        // Ignore storage parse errors.
      } finally {
        if (isMounted) {
          setBootstrapReady(true);
        }
      }
    };

    loadFromStorage();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const email = firebaseUser.email || '';
          const nextUser = {
            uid: firebaseUser.uid,
            email,
            isAdmin: email.toLowerCase() === ADMIN_EMAIL
          };

          setUser(nextUser);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
        } else {
          setUser(null);
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const intervalId = setInterval(async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!stored && userRef.current) {
          await signOut(auth);
          setUser(null);
        }
      } catch (error) {
        // Ignore polling errors.
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await signOut(auth);
    setUser(null);
  }, []);

  const loading = !(bootstrapReady && authReady);
  const value = useMemo(() => ({ user, loading, logout }), [user, loading, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

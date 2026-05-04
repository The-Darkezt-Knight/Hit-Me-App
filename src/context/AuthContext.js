import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { auth, db } from '../../firebaseConfig';

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
    let firestoreUnsubscribe = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const email = firebaseUser.email || '';
          const baseUser = {
            uid: firebaseUser.uid,
            email,
            isAdmin: email.toLowerCase() === ADMIN_EMAIL
          };

          if (firestoreUnsubscribe) {
            firestoreUnsubscribe();
          }

          firestoreUnsubscribe = onSnapshot(doc(db, 'users', firebaseUser.uid), async (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data();
              if (userData.isActive === false) {
                // User is deactivated
                await signOut(auth);
                setUser(null);
                await AsyncStorage.removeItem(STORAGE_KEY);
                return;
              }
            } else if (!baseUser.isAdmin) {
                // Check if user is newly created (e.g. less than 10 seconds ago)
                // If so, wait for the document to be created rather than logging them out immediately.
                const creationTime = firebaseUser.metadata?.creationTime;
                if (creationTime) {
                   const diffInMs = Date.now() - new Date(creationTime).getTime();
                   if (diffInMs > 10000) {
                      // Older user with no document, assume they were completely deleted
                      await signOut(auth);
                      setUser(null);
                      await AsyncStorage.removeItem(STORAGE_KEY);
                      return;
                   }
                   // if it's within 10s, don't sign out. Just set the user and let the subsequent snapshot update fix it.
                } else {
                   // If we can't tell, be conservative and don't sign out to avoid registration loops.
                }
            }

            setUser(baseUser);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(baseUser));
          });
        } else {
          setUser(null);
          await AsyncStorage.removeItem(STORAGE_KEY);
          if (firestoreUnsubscribe) {
            firestoreUnsubscribe();
            firestoreUnsubscribe = null;
          }
        }
      } finally {
        setAuthReady(true);
      }
    });

    return () => {
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
      }
      authUnsubscribe();
    };
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

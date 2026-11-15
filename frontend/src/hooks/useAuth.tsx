import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../firebase';

export interface DemoUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  getIdToken: () => Promise<string>;
}

interface AuthContextType {
  currentUser: User | DemoUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsDemo: () => void;
  register: (email: string, password: string, displayName: string) => Promise<User>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEMO_USER_PROFILE: DemoUser = {
  uid: 'demo-enterprise-admin',
  email: 'lead.architect@cryptopilot.io',
  displayName: 'Enterprise Security Lead',
  photoURL: '',
  getIdToken: async () => 'demo-token',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | DemoUser | null>(() => {
    if (localStorage.getItem('cryptopilot_demo_auth') === 'true') {
      return DEMO_USER_PROFILE;
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        localStorage.removeItem('cryptopilot_demo_auth');
        setCurrentUser(user);
      } else {
        if (localStorage.getItem('cryptopilot_demo_auth') === 'true') {
          setCurrentUser(DEMO_USER_PROFILE);
        } else {
          setCurrentUser(null);
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    localStorage.removeItem('cryptopilot_demo_auth');
    await signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    localStorage.removeItem('cryptopilot_demo_auth');
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginAsDemo = () => {
    localStorage.setItem('cryptopilot_demo_auth', 'true');
    setCurrentUser(DEMO_USER_PROFILE);
  };

  const register = async (email: string, password: string, displayName: string): Promise<User> => {
    localStorage.removeItem('cryptopilot_demo_auth');
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName });
    return user;
  };

  const logout = async () => {
    localStorage.removeItem('cryptopilot_demo_auth');
    setCurrentUser(null);
    try {
      await signOut(auth);
    } catch {
      // Ignored if not signed in with Firebase
    }
  };

  const getToken = async (): Promise<string | null> => {
    if (!currentUser) return null;
    return currentUser.getIdToken();
  };

  const value: AuthContextType = {
    currentUser,
    loading,
    login,
    loginWithGoogle,
    loginAsDemo,
    register,
    logout,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

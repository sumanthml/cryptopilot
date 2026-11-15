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
  loginWithCustomUser: (email: string, displayName?: string) => void;
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

function getStoredCustomUser(): DemoUser | null {
  const custom = localStorage.getItem('cryptopilot_custom_auth');
  if (custom) {
    try {
      const data = JSON.parse(custom);
      if (data && data.email) {
        return {
          uid: data.uid || data.email,
          email: data.email,
          displayName: data.displayName || data.email.split('@')[0],
          photoURL: data.photoURL || '',
          getIdToken: async () => `custom:${data.email}:${data.displayName || data.email.split('@')[0]}`,
        };
      }
    } catch {
      localStorage.removeItem('cryptopilot_custom_auth');
    }
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | DemoUser | null>(() => {
    const customUser = getStoredCustomUser();
    if (customUser) return customUser;
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
        localStorage.removeItem('cryptopilot_custom_auth');
        setCurrentUser(user);
      } else {
        const customUser = getStoredCustomUser();
        if (customUser) {
          setCurrentUser(customUser);
        } else if (localStorage.getItem('cryptopilot_demo_auth') === 'true') {
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
    localStorage.removeItem('cryptopilot_custom_auth');
    await signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    localStorage.removeItem('cryptopilot_demo_auth');
    localStorage.removeItem('cryptopilot_custom_auth');
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginAsDemo = () => {
    localStorage.removeItem('cryptopilot_custom_auth');
    localStorage.setItem('cryptopilot_demo_auth', 'true');
    setCurrentUser(DEMO_USER_PROFILE);
  };

  const loginWithCustomUser = (email: string, displayName?: string) => {
    localStorage.removeItem('cryptopilot_demo_auth');
    const name = displayName || email.split('@')[0];
    const userObj = {
      uid: email,
      email: email,
      displayName: name,
      photoURL: '',
    };
    localStorage.setItem('cryptopilot_custom_auth', JSON.stringify(userObj));
    setCurrentUser({
      ...userObj,
      getIdToken: async () => `custom:${email}:${name}`,
    });
  };

  const register = async (email: string, password: string, displayName: string): Promise<User> => {
    localStorage.removeItem('cryptopilot_demo_auth');
    localStorage.removeItem('cryptopilot_custom_auth');
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName });
    return user;
  };

  const logout = async () => {
    localStorage.removeItem('cryptopilot_demo_auth');
    localStorage.removeItem('cryptopilot_custom_auth');
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
    loginWithCustomUser,
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

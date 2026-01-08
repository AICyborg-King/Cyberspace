import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Subject } from '../types';

interface AuthContextType {
  user: User | null;
  login: (name: string, email: string, enableBiometrics?: boolean) => void;
  loginWithStoredUser: () => void;
  logout: () => void;
  isAuthenticated: boolean;
  storedUserExists: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [storedUserExists, setStoredUserExists] = useState(false);

  useEffect(() => {
    // Check local storage for persisted session on mount
    const storedUser = localStorage.getItem('edufly_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setStoredUserExists(true);
      // Auto-login only if they didn't opt for biometrics (traditional session persistence)
      // If biometrics enabled, we wait for explicit login action in UI
      if (!parsedUser.biometricsEnabled) {
         setUser(parsedUser);
      }
    }
  }, []);

  const login = (name: string, email: string, enableBiometrics: boolean = false) => {
    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      gradeLevel: '10th Grade', // Default for demo
      subjects: [Subject.MATH, Subject.SCIENCE, Subject.ENGLISH, Subject.HISTORY],
      biometricsEnabled: enableBiometrics
    };
    setUser(newUser);
    localStorage.setItem('edufly_user', JSON.stringify(newUser));
    setStoredUserExists(true);
  };

  const loginWithStoredUser = () => {
    const storedUser = localStorage.getItem('edufly_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  };

  const logout = () => {
    setUser(null);
    // We do NOT remove the item from localStorage if biometrics are enabled,
    // because we need the data there to "resume" the session after fingerprint scan.
    // If regular login, we clear it.
    const stored = localStorage.getItem('edufly_user');
    if (stored) {
        const u = JSON.parse(stored);
        if (!u.biometricsEnabled) {
            localStorage.removeItem('edufly_user');
            setStoredUserExists(false);
        }
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithStoredUser, logout, isAuthenticated: !!user, storedUserExists }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
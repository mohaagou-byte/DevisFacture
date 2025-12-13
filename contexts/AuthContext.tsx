import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const stored = localStorage.getItem('devisfacture_session');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem('devisfacture_session');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        // Simulating a backend check. In a real app, this hits an API.
        // For this demo, we check a local "database" of users.
        const usersStr = localStorage.getItem('devisfacture_users');
        const users: any[] = usersStr ? JSON.parse(usersStr) : [];
        const found = users.find(u => u.email === email && u.pass === pass);
        
        if (found) {
          const u: User = { id: found.id, name: found.name, email: found.email };
          setUser(u);
          localStorage.setItem('devisfacture_session', JSON.stringify(u));
          resolve();
        } else {
          // Fallback for demo purposes if no users exist yet, allow admin/admin
          if (email === 'admin@demo.com' && pass === 'password') {
             const u = { id: 'admin', name: 'Demo User', email: 'admin@demo.com' };
             setUser(u);
             localStorage.setItem('devisfacture_session', JSON.stringify(u));
             resolve();
          } else {
            reject(new Error('Email ou mot de passe incorrect.'));
          }
        }
      }, 800);
    });
  };

  const register = async (name: string, email: string, pass: string) => {
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        const usersStr = localStorage.getItem('devisfacture_users');
        const users: any[] = usersStr ? JSON.parse(usersStr) : [];
        
        if (users.find(u => u.email === email)) {
          reject(new Error('Cet email est déjà utilisé.'));
          return;
        }

        const newUser = { id: Date.now().toString(), name, email, pass };
        users.push(newUser);
        localStorage.setItem('devisfacture_users', JSON.stringify(users));

        const u: User = { id: newUser.id, name: newUser.name, email: newUser.email };
        setUser(u);
        localStorage.setItem('devisfacture_session', JSON.stringify(u));
        resolve();
      }, 800);
    });
  };

  const loginWithGoogle = async () => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Mock Google Login
        const u: User = { 
          id: 'google_' + Date.now(), 
          name: 'Utilisateur Google', 
          email: 'user@gmail.com',
          avatarUrl: 'https://lh3.googleusercontent.com/a/ACg8ocIq8d_8d_8d_8d_8d_8d_8d_8d_8d_8d_8d=s96-c' 
        };
        setUser(u);
        localStorage.setItem('devisfacture_session', JSON.stringify(u));
        resolve();
      }, 1000);
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('devisfacture_session');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
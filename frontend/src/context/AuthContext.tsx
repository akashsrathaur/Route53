'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, User } from '@/lib/api';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  loading: boolean;
  switchUser: (userId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  users: [],
  loading: true,
  switchUser: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [me, userList] = await Promise.allSettled([api.getCurrentUser(), api.listUsers()]);
      if (me.status === 'fulfilled') {
        setCurrentUser(me.value);
      }
      if (userList.status === 'fulfilled') {
        setUsers(userList.value);
      }
    } catch (err) {
      console.error('Error loading auth info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const switchUser = async (userId: string) => {
    try {
      const updated = await api.switchUser(userId);
      setCurrentUser(updated);
    } catch (err) {
      console.error('Failed to switch user:', err);
    }
  };

  const refreshUser = async () => {
    await loadData();
  };

  return (
    <AuthContext.Provider value={{ currentUser, users, loading, switchUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

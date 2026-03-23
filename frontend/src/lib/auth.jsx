import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import api from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (accessToken) => {
    try {
      const res = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setProfile(res.data);
      return res.data;
    } catch {
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s) {
        setSession(s);
        setUser(s.user);
        await fetchProfile(s.access_token);
      }
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s?.user) {
        setUser(s.user);
        await fetchProfile(s.access_token);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, [fetchProfile]);

  const signUp = useCallback(async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    // Immediately store session so setupClinic has it
    if (data?.session) {
      setSession(data.session);
      setUser(data.session.user);
    } else if (data?.user) {
      setUser(data.user);
    }
    return { data, error };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (data?.session) {
      setSession(data.session);
      setUser(data.session.user);
    }
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  const setupClinic = useCallback(async (setupData) => {
    if (!session) return { error: 'No session' };
    try {
      const res = await api.post('/auth/setup-clinic', setupData, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setProfile(res.data.user);
      return { data: res.data, error: null };
    } catch (err) {
      return { data: null, error: err.response?.data?.detail || 'Setup failed' };
    }
  }, [session]);

  const getToken = useCallback(() => session?.access_token, [session]);

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
      signUp, signIn, signOut, setupClinic, getToken, fetchProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

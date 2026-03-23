import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Zap, KeyRound } from 'lucide-react';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, fetchProfile, session } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await api.post('/members/change-password', { new_password: password });
      // Re-fetch profile after password change
      if (session?.access_token) {
        await fetchProfile(session.access_token);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change password');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <Zap className="h-9 w-9 text-primary" />
            <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>Zap AI</span>
          </div>
        </div>

        <Card className="rounded-xl border-slate-200/60 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3">
              <KeyRound className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Set Your Password</CardTitle>
            <CardDescription>
              Your account was created with a temporary password. Please set a new password to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>New Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} className="mt-1.5" />
              </div>
              <div>
                <Label>Confirm Password</Label>
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" required className="mt-1.5" />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
              <Button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-11">
                {submitting ? 'Saving...' : 'Set Password & Continue'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

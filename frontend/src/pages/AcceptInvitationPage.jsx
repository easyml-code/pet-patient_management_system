import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Zap, CheckCircle2 } from 'lucide-react';

export default function AcceptInvitationPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await api.get(`/invitations/${token}/verify`);
        setInvitation(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Invalid or expired invitation link');
      }
      setLoading(false);
    };
    verify();
  }, [token]);

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
      await api.post(`/invitations/${token}/accept`, { password });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create account');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
          {success ? (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-3">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                </div>
                <CardTitle className="text-2xl">Account Created!</CardTitle>
                <CardDescription>Your account has been set up successfully. You can now sign in.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/login')} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-11">
                  Go to Sign In
                </Button>
              </CardContent>
            </>
          ) : invitation ? (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Welcome, {invitation.full_name}!</CardTitle>
                <CardDescription>
                  You've been invited to join <span className="font-semibold text-slate-700">{invitation.clinic_name}</span> as a <span className="font-semibold text-primary capitalize">{invitation.role}</span>.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label className="text-xs text-slate-500">Email</Label>
                    <p className="text-sm font-medium text-slate-900">{invitation.email}</p>
                  </div>
                  <div>
                    <Label>Set Your Password</Label>
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Confirm Password</Label>
                    <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" required className="mt-1.5" />
                  </div>
                  {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
                  <Button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-11">
                    {submitting ? 'Creating account...' : 'Create Account & Join'}
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-red-600">Invalid Invitation</CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/login">
                  <Button variant="outline" className="w-full rounded-lg h-11">Go to Sign In</Button>
                </Link>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

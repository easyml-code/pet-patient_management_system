import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Zap, Upload, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { THEME_PRESETS } from '@/lib/theme';


export default function RegisterPage() {
  const { user, session, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [clinicForm, setClinicForm] = useState({
    clinic_name: '', clinic_type: 'human_clinic', description: '',
    email: '', phone: '', address: '', city: '', state: '', country: '', postal_code: '',
    website_url: '', timezone: '', logo_url: '', theme_color: '#2563EB',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { signUp, setupClinic } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user && !profile) setStep(2);
    if (user && profile) navigate('/dashboard');
  }, [user, profile, navigate]);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { data, error: err } = await signUp(email, password, fullName);
    if (err) { setError(err.message || 'Signup failed'); setLoading(false); return; }
    if (data?.user) setStep(2);
    setLoading(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `logos/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('clinic-assets').upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('clinic-assets').getPublicUrl(path);
      setClinicForm(f => ({ ...f, logo_url: urlData.publicUrl }));
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
  };

  const handleSetupClinic = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await setupClinic(clinicForm);
    setLoading(false);
    if (err) {
      setError(typeof err === 'string' ? err : 'Clinic setup failed');
    } else {
      navigate('/dashboard');
    }
  };

  const updateClinic = (field, value) => setClinicForm(f => ({ ...f, [field]: value }));
  const totalSteps = 3;
  const stepTitles = ['Create your account', 'Clinic basics', 'Contact & details'];

  return (
    <div data-testid="register-page" className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <Zap className="h-9 w-9 text-primary" />
            <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>Zap AI</span>
          </Link>
        </div>
        <Card className="rounded-xl border-slate-200/60 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{stepTitles[step - 1]}</CardTitle>
            <CardDescription>
              {step === 1 ? 'Start automating your clinic in minutes' : step === 2 ? 'Tell us about your clinic' : 'Help patients find you'}
            </CardDescription>
            <div className="flex gap-2 justify-center mt-4">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div key={i} className={`h-1.5 w-12 rounded-full ${step >= i + 1 ? 'bg-primary' : 'bg-slate-200'}`} />
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" data-testid="register-name-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Jane Smith" required disabled={loading} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" data-testid="register-email-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@clinic.com" required disabled={loading} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" data-testid="register-password-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} disabled={loading} className="mt-1.5" />
                </div>
                {error && <p data-testid="register-error" className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
                <Button data-testid="register-submit-btn" type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-11">
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-4">
                <div>
                  <Label>Clinic Name *</Label>
                  <Input data-testid="register-clinic-name-input" value={clinicForm.clinic_name} onChange={e => updateClinic('clinic_name', e.target.value)} placeholder="Sunshine Family Clinic" required className="mt-1.5" />
                </div>
                <div>
                  <Label>Clinic Type</Label>
                  <Select value={clinicForm.clinic_type} onValueChange={v => updateClinic('clinic_type', v)}>
                    <SelectTrigger data-testid="register-clinic-type-select" className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="human_clinic">Human Clinic</SelectItem>
                      <SelectItem value="pet_clinic">Pet / Veterinary Clinic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={clinicForm.description} onChange={e => updateClinic('description', e.target.value)} placeholder="A brief tagline for your clinic" className="mt-1.5" />
                </div>
                <div>
                  <Label>Clinic Logo</Label>
                  <div className="mt-1.5 flex items-center gap-3">
                    {clinicForm.logo_url ? (
                      <img src={clinicForm.logo_url} alt="Logo" className="h-12 w-12 rounded-lg object-cover border" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center">
                        <Upload className="h-5 w-5 text-slate-400" />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <span className="text-sm text-primary hover:underline">{uploading ? 'Uploading...' : 'Upload logo'}</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploading} />
                    </label>
                  </div>
                </div>
                <div>
                  <Label>Theme Color</Label>
                  <p className="text-xs text-slate-400 mt-0.5 mb-2">Choose your clinic's brand color</p>
                  <div className="flex flex-wrap gap-2">
                    {THEME_PRESETS.map(preset => (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => updateClinic('theme_color', preset.hex)}
                        className="relative w-9 h-9 rounded-full border-2 transition-all"
                        style={{
                          backgroundColor: preset.hex,
                          borderColor: clinicForm.theme_color === preset.hex ? preset.hex : 'transparent',
                          boxShadow: clinicForm.theme_color === preset.hex ? `0 0 0 2px white, 0 0 0 4px ${preset.hex}` : 'none',
                        }}
                        title={preset.name}
                      >
                        {clinicForm.theme_color === preset.hex && (
                          <Check className="h-4 w-4 text-white absolute inset-0 m-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                {error && <p data-testid="register-error" className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
                <Button type="submit" disabled={!clinicForm.clinic_name} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-11">
                  Continue
                </Button>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleSetupClinic} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Business Email</Label>
                    <Input value={clinicForm.email} onChange={e => updateClinic('email', e.target.value)} type="email" placeholder="info@clinic.com" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Business Phone</Label>
                    <Input value={clinicForm.phone} onChange={e => updateClinic('phone', e.target.value)} placeholder="+1 555-0123" className="mt-1.5" />
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  <Input value={clinicForm.address} onChange={e => updateClinic('address', e.target.value)} placeholder="123 Main Street" className="mt-1.5" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>City</Label>
                    <Input value={clinicForm.city} onChange={e => updateClinic('city', e.target.value)} placeholder="Mumbai" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input value={clinicForm.state} onChange={e => updateClinic('state', e.target.value)} placeholder="Maharashtra" className="mt-1.5" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Country</Label>
                    <Input value={clinicForm.country} onChange={e => updateClinic('country', e.target.value)} placeholder="India" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Postal Code</Label>
                    <Input value={clinicForm.postal_code} onChange={e => updateClinic('postal_code', e.target.value)} placeholder="400001" className="mt-1.5" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Website</Label>
                    <Input value={clinicForm.website_url} onChange={e => updateClinic('website_url', e.target.value)} placeholder="https://clinic.com" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Timezone</Label>
                    <Input value={clinicForm.timezone} onChange={e => updateClinic('timezone', e.target.value)} placeholder="Asia/Kolkata" className="mt-1.5" />
                  </div>
                </div>
                {error && <p data-testid="register-error" className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1 rounded-lg h-11">Back</Button>
                  <Button data-testid="register-clinic-submit-btn" type="submit" disabled={loading} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-11">
                    {loading ? 'Setting up...' : 'Launch My Clinic'}
                  </Button>
                </div>
              </form>
            )}
            {step === 1 && (
              <p className="mt-6 text-center text-sm text-slate-500">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
              </p>
            )}
          </CardContent>
        </Card>
        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

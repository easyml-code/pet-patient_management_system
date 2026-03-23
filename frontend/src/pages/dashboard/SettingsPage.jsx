import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Building2, Save, Check, Palette, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { THEME_PRESETS, applyThemeColor } from '@/lib/theme';

export default function SettingsPage() {
  const { profile } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [form, setForm] = useState({ name: '', type: '', email: '', phone: '', address: '', theme_color: '#2563EB' });
  const [rxConfig, setRxConfig] = useState({ tagline: '', show_logo: true, footer_text: '' });
  const [saving, setSaving] = useState(false);
  const [savingRx, setSavingRx] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/tenant/me');
        setTenant(res.data);
        setForm({ name: res.data.name, type: res.data.type, email: res.data.email || '', phone: res.data.phone || '', address: res.data.address || '', theme_color: res.data.theme_color || '#2563EB' });
        const pc = res.data.settings?.prescription_config || {};
        setRxConfig({ tagline: pc.tagline || '', show_logo: pc.show_logo !== false, footer_text: pc.footer_text || '' });
      } catch (e) { console.error(e); }
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/tenant/me', form);
      setTenant(res.data);
      if (res.data.theme_color) applyThemeColor(res.data.theme_color);
      toast.success('Settings saved');
    } catch (e) { toast.error('Failed to save'); }
    setSaving(false);
  };

  return (
    <div data-testid="settings-page" className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your clinic configuration</p>
      </div>

      {/* Clinic Settings - Admin Only */}
      {(profile?.is_admin || profile?.role === 'admin') && (
        <Card className="rounded-xl border-slate-200/60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Clinic Details</CardTitle>
            <CardDescription>Update your clinic information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Clinic Name</Label>
              <Input data-testid="settings-clinic-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Clinic Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="human_clinic">Human Clinic</SelectItem>
                  <SelectItem value="pet_clinic">Pet / Veterinary Clinic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1.5" /></div>
            </div>
            <div>
              <Label>Address</Label>
              <Input data-testid="settings-address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label className="flex items-center gap-1.5"><Palette className="h-3.5 w-3.5" /> Theme Color</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {THEME_PRESETS.map(preset => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setForm({ ...form, theme_color: preset.hex })}
                    className="relative w-8 h-8 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: preset.hex,
                      borderColor: form.theme_color === preset.hex ? preset.hex : 'transparent',
                      boxShadow: form.theme_color === preset.hex ? `0 0 0 2px white, 0 0 0 4px ${preset.hex}` : 'none',
                    }}
                    title={preset.name}
                  >
                    {form.theme_color === preset.hex && (
                      <Check className="h-3.5 w-3.5 text-white absolute inset-0 m-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <Button data-testid="settings-save-btn" onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg">
              <Save className="h-4 w-4 mr-1.5" /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Prescription Template - Admin Only */}
      {profile?.role === 'admin' && tenant && (
        <Card className="rounded-xl border-slate-200/60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Prescription Template</CardTitle>
            <CardDescription>Configure the digital prescription layout for your clinic</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tagline / Description</Label>
              <Input
                value={rxConfig.tagline}
                onChange={e => setRxConfig(c => ({ ...c, tagline: e.target.value }))}
                placeholder="e.g. Your trusted healthcare partner"
                className="mt-1.5"
              />
              <p className="text-xs text-slate-400 mt-1">Appears under the clinic name on prescriptions</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Show Logo on Prescription</Label>
                <p className="text-xs text-slate-400 mt-0.5">Display your clinic logo on the prescription header</p>
              </div>
              <Switch
                checked={rxConfig.show_logo}
                onCheckedChange={v => setRxConfig(c => ({ ...c, show_logo: v }))}
              />
            </div>
            <div>
              <Label>Footer Custom Text</Label>
              <Input
                value={rxConfig.footer_text}
                onChange={e => setRxConfig(c => ({ ...c, footer_text: e.target.value }))}
                placeholder="e.g. Get well soon! | We care for your health"
                className="mt-1.5"
              />
              <p className="text-xs text-slate-400 mt-1">Additional text shown in the prescription footer</p>
            </div>
            <Button
              onClick={async () => {
                setSavingRx(true);
                try {
                  const settings = { ...(tenant.settings || {}), prescription_config: rxConfig };
                  await api.put('/tenant/me', { settings });
                  setTenant(prev => ({ ...prev, settings }));
                  toast.success('Prescription template saved');
                } catch { toast.error('Failed to save'); }
                setSavingRx(false);
              }}
              disabled={savingRx}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
            >
              <Save className="h-4 w-4 mr-1.5" /> {savingRx ? 'Saving...' : 'Save Template'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

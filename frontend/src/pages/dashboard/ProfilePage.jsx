import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  ArrowLeft, User, Mail, Phone, MapPin, GraduationCap,
  Stethoscope, FileText, Award, Save, Shield, Camera, Loader2, Trash2,
  Clock, Plus, Pencil, X, IndianRupee
} from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const photoInputRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  // Doctor availability & services
  const [availability, setAvailability] = useState([]);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({});
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [services, setServices] = useState([]);
  const [svcDialog, setSvcDialog] = useState(false);
  const [svcForm, setSvcForm] = useState({});
  const [editingSvc, setEditingSvc] = useState(null);
  const [savingSvc, setSavingSvc] = useState(false);

  const fetchDoctorData = useCallback(async () => {
    try {
      const [availRes, svcRes] = await Promise.all([
        api.get('/availability/my'),
        api.get('/services/my'),
      ]);
      setAvailability(availRes.data);
      setServices(svcRes.data);
    } catch (e) { /* not a doctor or no data yet */ }
  }, []);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/profile/me');
        setData(res.data);
        setForm(res.data);
        if (res.data.role === 'doctor') fetchDoctorData();
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetch();
  }, [fetchDoctorData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/profile/me', {
        full_name: form.full_name,
        phone: form.phone,
        address: form.address,
        qualification: form.qualification,
        photo_url: form.photo_url,
        specialization: form.specialization,
        license_number: form.license_number,
        registration_number: form.registration_number,
        color: form.color,
        staff_role: form.staff_role,
      });
      setData(res.data);
      setForm(res.data);
      setEditing(false);
      toast.success('Profile updated');
    } catch (e) {
      toast.error('Failed to update profile');
    }
    setSaving(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setData(prev => ({ ...prev, photo_url: res.data.url }));
      setForm(prev => ({ ...prev, photo_url: res.data.url }));
      toast.success('Photo uploaded');
    } catch (err) {
      toast.error('Failed to upload photo');
    }
    setUploading(false);
  };

  const handlePhotoDelete = async () => {
    setUploading(true);
    try {
      await api.delete('/profile/photo');
      setData(prev => ({ ...prev, photo_url: null }));
      setForm(prev => ({ ...prev, photo_url: null }));
      toast.success('Photo removed');
    } catch (err) {
      toast.error('Failed to remove photo');
    }
    setUploading(false);
  };

  // ── Schedule helpers ──
  const initScheduleForm = () => {
    const form = {};
    DAYS.forEach((_, i) => {
      const daySlots = availability.filter(a => a.day_of_week === i && a.is_available);
      form[i] = daySlots.length > 0
        ? { enabled: true, slots: daySlots.map(s => ({ start: s.start_time, end: s.end_time })) }
        : { enabled: false, slots: [{ start: '09:00', end: '17:00' }] };
    });
    setScheduleForm(form);
  };

  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    try {
      const slots = [];
      Object.entries(scheduleForm).forEach(([day, val]) => {
        if (val.enabled) {
          val.slots.forEach(s => {
            if (s.start && s.end) {
              slots.push({ day_of_week: parseInt(day), start_time: s.start, end_time: s.end, is_available: true });
            }
          });
        }
      });
      const res = await api.post('/availability/bulk', { slots });
      setAvailability(res.data);
      setEditingSchedule(false);
      toast.success('Availability saved');
    } catch (e) {
      toast.error('Failed to save availability');
    }
    setSavingSchedule(false);
  };

  // ── Service helpers ──
  const openAddService = () => {
    setEditingSvc(null);
    setSvcForm({ name: '', description: '', duration_minutes: 30, price: 0, color: '#2563EB' });
    setSvcDialog(true);
  };
  const openEditService = (svc) => {
    setEditingSvc(svc.id);
    setSvcForm({ name: svc.name, description: svc.description || '', duration_minutes: svc.duration_minutes, price: svc.price, color: svc.color });
    setSvcDialog(true);
  };
  const handleSaveService = async () => {
    setSavingSvc(true);
    try {
      if (editingSvc) {
        await api.put(`/services/${editingSvc}`, svcForm);
      } else {
        await api.post('/services', svcForm);
      }
      await fetchDoctorData();
      setSvcDialog(false);
      toast.success(editingSvc ? 'Service updated' : 'Service created');
    } catch (e) {
      toast.error('Failed to save service');
    }
    setSavingSvc(false);
  };
  const handleDeleteService = async (id) => {
    try {
      await api.delete(`/services/${id}`);
      setServices(prev => prev.filter(s => s.id !== id));
      toast.success('Service deleted');
    } catch (e) {
      toast.error('Failed to delete service');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Could not load profile</p>
      </div>
    );
  }

  const isDoctor = data.role === 'doctor';
  const isStaff = data.role === 'staff';
  const isAdmin = data.is_admin || data.role === 'admin';

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Profile</h1>
          <p className="text-sm text-slate-500 mt-0.5">View and update your personal details</p>
        </div>
      </div>

      {/* Profile Header Card */}
      <Card className="rounded-xl border-slate-200/60">
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              {data.photo_url ? (
                <img src={data.photo_url} alt={data.full_name} className="w-20 h-20 rounded-full object-cover border-2 border-slate-200" />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                  style={{ backgroundColor: data.color || (isDoctor ? '#2563EB' : isStaff ? '#6366F1' : '#0F172A') }}
                >
                  {data.full_name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              {editing && (
                <>
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {uploading ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : (
                      <Camera className="h-5 w-5 text-white" />
                    )}
                  </button>
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </>
              )}
              {editing && data.photo_url && (
                <button
                  onClick={handlePhotoDelete}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-sm transition-colors"
                  title="Remove photo"
                >
                  <Trash2 className="h-3 w-3 text-white" />
                </button>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-slate-900">{data.full_name}</h2>
              <p className="text-sm text-slate-500">{data.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {data.role !== 'admin' && (
                  <Badge className="rounded-full text-xs capitalize bg-primary/15 text-primary">
                    {data.role}
                  </Badge>
                )}
                {isAdmin && (
                  <Badge className="rounded-full text-xs bg-slate-900 text-white">
                    <Shield className="h-3 w-3 mr-1" /> Admin
                  </Badge>
                )}
                {isDoctor && data.specialization && (
                  <Badge variant="outline" className="rounded-full text-xs">{data.specialization}</Badge>
                )}
                {isStaff && data.staff_role && (
                  <Badge variant="outline" className="rounded-full text-xs">{data.staff_role}</Badge>
                )}
              </div>
            </div>
            {!editing && (
              <Button variant="outline" onClick={() => setEditing(true)} className="shrink-0">
                Edit Profile
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {editing ? (
        /* ── Edit Mode ── */
        <>
          <Card className="rounded-xl border-slate-200/60">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input value={form.full_name || ''} onChange={e => setForm({ ...form, full_name: e.target.value })} className="mt-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input value={form.email || ''} disabled className="mt-1.5 bg-slate-50" />
                  <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1.5" />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Your address" className="mt-1.5" />
              </div>
            </CardContent>
          </Card>

          {isDoctor && (
            <Card className="rounded-xl border-slate-200/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-primary" /> Professional Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Specialization</Label>
                    <Input value={form.specialization || ''} onChange={e => setForm({ ...form, specialization: e.target.value })} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Qualification / Degree</Label>
                    <Input value={form.qualification || ''} onChange={e => setForm({ ...form, qualification: e.target.value })} placeholder="e.g. MBBS, MD, BVSc" className="mt-1.5" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>License Number</Label>
                    <Input value={form.license_number || ''} onChange={e => setForm({ ...form, license_number: e.target.value })} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Registration Number</Label>
                    <Input value={form.registration_number || ''} onChange={e => setForm({ ...form, registration_number: e.target.value })} className="mt-1.5" />
                  </div>
                </div>
                <div>
                  <Label>Calendar Color</Label>
                  <Input type="color" value={form.color || '#2563EB'} onChange={e => setForm({ ...form, color: e.target.value })} className="mt-1.5 h-10 w-20" />
                </div>
              </CardContent>
            </Card>
          )}

          {isStaff && (
            <Card className="rounded-xl border-slate-200/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Role Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Role / Title</Label>
                    <Input value={form.staff_role || ''} onChange={e => setForm({ ...form, staff_role: e.target.value })} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Qualification / Degree</Label>
                    <Input value={form.qualification || ''} onChange={e => setForm({ ...form, qualification: e.target.value })} placeholder="e.g. B.Sc Nursing, GNM" className="mt-1.5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setForm(data); setEditing(false); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Save className="h-4 w-4 mr-1.5" /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </>
      ) : (
        /* ── View Mode ── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Account / Contact Info */}
          <Card className="rounded-xl border-slate-200/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Account & Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <InfoRow label="Full Name" value={data.full_name} icon={<User className="h-3.5 w-3.5 text-slate-400" />} />
              <InfoRow label="Email" value={data.email} icon={<Mail className="h-3.5 w-3.5 text-slate-400" />} />
              <InfoRow label="Phone" value={data.phone} icon={<Phone className="h-3.5 w-3.5 text-slate-400" />} />
              <InfoRow label="Address" value={data.address} icon={<MapPin className="h-3.5 w-3.5 text-slate-400" />} />
              <InfoRow label="Role" value={
                <span className="capitalize flex items-center gap-1.5">
                  {data.role !== 'admin' && data.role}
                  {isAdmin && <span className="bg-slate-900 text-white text-xs px-1.5 py-0.5 rounded-full">Admin</span>}
                </span>
              } icon={<Shield className="h-3.5 w-3.5 text-slate-400" />} />
            </CardContent>
          </Card>

          {/* Professional Details */}
          {isDoctor && (
            <Card className="rounded-xl border-slate-200/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-primary" /> Professional Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow label="Specialization" value={data.specialization} icon={<Stethoscope className="h-3.5 w-3.5 text-slate-400" />} />
                <InfoRow label="Qualification" value={data.qualification} icon={<GraduationCap className="h-3.5 w-3.5 text-slate-400" />} />
                <InfoRow label="License No." value={data.license_number} icon={<Award className="h-3.5 w-3.5 text-slate-400" />} />
                <InfoRow label="Registration No." value={data.registration_number} icon={<FileText className="h-3.5 w-3.5 text-slate-400" />} />
                <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-500">Calendar Color</span>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: data.color || '#2563EB' }} />
                    <span className="text-sm text-slate-700">{data.color || '#2563EB'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isStaff && (
            <Card className="rounded-xl border-slate-200/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Role Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow label="Role / Title" value={data.staff_role} />
                <InfoRow label="Qualification" value={data.qualification} icon={<GraduationCap className="h-3.5 w-3.5 text-slate-400" />} />
              </CardContent>
            </Card>
          )}

          {isAdmin && (
            <Card className="rounded-xl border-slate-200/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> Admin Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">You have full administrative access to clinic settings, team management, and all patient data.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/dashboard/settings')}>
                  Go to Clinic Settings
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      {/* ── Doctor: Availability Schedule ── */}
      {isDoctor && (
        <Card className="rounded-xl border-slate-200/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Availability Schedule
              </CardTitle>
              {!editingSchedule ? (
                <Button variant="outline" size="sm" onClick={() => { initScheduleForm(); setEditingSchedule(true); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Schedule
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingSchedule(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveSchedule} disabled={savingSchedule}>
                    <Save className="h-3.5 w-3.5 mr-1" /> {savingSchedule ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editingSchedule ? (
              <div className="space-y-3">
                {DAYS.map((day, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                    <div className="w-24 pt-1">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={scheduleForm[i]?.enabled || false}
                          onCheckedChange={(v) => setScheduleForm(prev => ({ ...prev, [i]: { ...prev[i], enabled: v } }))}
                        />
                        <span className="text-sm font-medium text-slate-700">{day.slice(0, 3)}</span>
                      </div>
                    </div>
                    {scheduleForm[i]?.enabled && (
                      <div className="flex-1 space-y-2">
                        {scheduleForm[i].slots.map((slot, si) => (
                          <div key={si} className="flex items-center gap-2">
                            <Input type="time" value={slot.start} className="w-32"
                              onChange={e => {
                                const slots = [...scheduleForm[i].slots];
                                slots[si] = { ...slots[si], start: e.target.value };
                                setScheduleForm(prev => ({ ...prev, [i]: { ...prev[i], slots } }));
                              }}
                            />
                            <span className="text-slate-400 text-sm">to</span>
                            <Input type="time" value={slot.end} className="w-32"
                              onChange={e => {
                                const slots = [...scheduleForm[i].slots];
                                slots[si] = { ...slots[si], end: e.target.value };
                                setScheduleForm(prev => ({ ...prev, [i]: { ...prev[i], slots } }));
                              }}
                            />
                            {scheduleForm[i].slots.length > 1 && (
                              <button onClick={() => {
                                const slots = scheduleForm[i].slots.filter((_, j) => j !== si);
                                setScheduleForm(prev => ({ ...prev, [i]: { ...prev[i], slots } }));
                              }} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
                            )}
                          </div>
                        ))}
                        <button onClick={() => {
                          const slots = [...scheduleForm[i].slots, { start: '09:00', end: '17:00' }];
                          setScheduleForm(prev => ({ ...prev, [i]: { ...prev[i], slots } }));
                        }} className="text-xs text-primary hover:underline flex items-center gap-1">
                          <Plus className="h-3 w-3" /> Add time slot
                        </button>
                      </div>
                    )}
                    {!scheduleForm[i]?.enabled && (
                      <span className="text-sm text-slate-400 pt-1">Off</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {DAYS.map((day, i) => {
                  const daySlots = availability.filter(a => a.day_of_week === i && a.is_available);
                  return (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <span className="text-sm font-medium text-slate-700 w-24">{day.slice(0, 3)}</span>
                      {daySlots.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {daySlots.map((s, j) => (
                            <span key={j} className="text-sm text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md">
                              {s.start_time} – {s.end_time}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">Off</span>
                      )}
                    </div>
                  );
                })}
                {availability.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-3">No schedule set. Click "Edit Schedule" to configure your availability.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Doctor: My Services ── */}
      {isDoctor && (
        <Card className="rounded-xl border-slate-200/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-primary" /> My Services
              </CardTitle>
              <Button variant="outline" size="sm" onClick={openAddService}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Service
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No services yet. Add your services so patients can book appointments.</p>
            ) : (
              <div className="space-y-2">
                {services.map(svc => (
                  <div key={svc.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: svc.color }} />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{svc.name}</p>
                        <p className="text-xs text-slate-500">
                          {svc.duration_minutes} min
                          {svc.price > 0 && <> · <IndianRupee className="h-3 w-3 inline" />{svc.price}</>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditService(svc)}>
                        <Pencil className="h-3.5 w-3.5 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteService(svc.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Service Add/Edit Dialog */}
      <Dialog open={svcDialog} onOpenChange={setSvcDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSvc ? 'Edit Service' : 'Add Service'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Service Name</Label>
              <Input value={svcForm.name || ''} onChange={e => setSvcForm({ ...svcForm, name: e.target.value })} placeholder="e.g. General Consultation" className="mt-1.5" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={svcForm.description || ''} onChange={e => setSvcForm({ ...svcForm, description: e.target.value })} placeholder="Brief description" className="mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration (min)</Label>
                <Input type="number" value={svcForm.duration_minutes || 30} onChange={e => setSvcForm({ ...svcForm, duration_minutes: parseInt(e.target.value) || 30 })} className="mt-1.5" />
              </div>
              <div>
                <Label>Price</Label>
                <Input type="number" value={svcForm.price || 0} onChange={e => setSvcForm({ ...svcForm, price: parseFloat(e.target.value) || 0 })} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Color</Label>
              <Input type="color" value={svcForm.color || '#2563EB'} onChange={e => setSvcForm({ ...svcForm, color: e.target.value })} className="mt-1.5 h-10 w-20" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSvcDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveService} disabled={savingSvc || !svcForm.name}>
              {savingSvc ? 'Saving...' : editingSvc ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value, icon }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900 flex items-center gap-1.5 text-right max-w-[60%]">
        {icon}
        {value || <span className="text-slate-300">-</span>}
      </span>
    </div>
  );
}

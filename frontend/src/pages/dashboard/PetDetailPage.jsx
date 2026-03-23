import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  ArrowLeft, PawPrint, User, Calendar, FileText, Pill, ClipboardList, Syringe,
  Phone, Mail, MapPin, Camera, Upload, Edit2, Plus, ChevronDown, ChevronUp,
  ExternalLink, Paperclip, Download
} from 'lucide-react';
import { format, parseISO, differenceInYears, differenceInMonths, isPast } from 'date-fns';
import { toast } from 'sonner';
import DownloadPrescription from '@/components/DownloadPrescription';

const STATUS_STYLES = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-yellow-100 text-yellow-700',
};

function petAge(dob) {
  if (!dob) return null;
  const d = typeof dob === 'string' ? parseISO(dob) : dob;
  const years = differenceInYears(new Date(), d);
  if (years >= 1) return `${years} yr${years > 1 ? 's' : ''}`;
  const months = differenceInMonths(new Date(), d);
  return `${months} mo${months !== 1 ? 's' : ''}`;
}

export default function PetDetailPage() {
  const { petId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const photoInputRef = useRef(null);
  const docInputRef = useRef(null);
  const apptDocRef = useRef(null);

  const [pet, setPet] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [reports, setReports] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Expanded appointment row
  const [expandedAppt, setExpandedAppt] = useState(null);
  const [apptDetails, setApptDetails] = useState({});

  // Edit pet dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Create appointment dialog
  const [createApptOpen, setCreateApptOpen] = useState(false);
  const [apptForm, setApptForm] = useState({ doctor_id: '', service_id: '', date: '', start_time: '', notes: '' });
  const [apptSlots, setApptSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [doctorSvcs, setDoctorSvcs] = useState([]);

  // Edit appointment dialog
  const [editApptOpen, setEditApptOpen] = useState(false);
  const [editApptForm, setEditApptForm] = useState({});

  // Add medical record dialog
  const [mrOpen, setMrOpen] = useState(false);
  const [mrForm, setMrForm] = useState({ title: '', record_type: 'consultation', diagnosis: '', treatment: '', description: '' });

  // Add vaccination dialog
  const [vacOpen, setVacOpen] = useState(false);
  const [vacForm, setVacForm] = useState({ title: '', description: '', treatment: '' });

  // Add report dialog
  const [repOpen, setRepOpen] = useState(false);
  const [repForm, setRepForm] = useState({ title: '', report_type: 'lab_result', description: '', file_url: '' });

  // Upload doc for specific appointment
  const [uploadApptId, setUploadApptId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [petRes, apptRes, mrRes, rxRes, repRes, docRes, svcRes, tenantRes] = await Promise.all([
        api.get(`/pets/${petId}`),
        api.get(`/pets/${petId}/appointments`),
        api.get(`/pets/${petId}/medical-records`),
        api.get(`/pets/${petId}/prescriptions`),
        api.get(`/pets/${petId}/reports`),
        api.get('/doctors'),
        api.get('/services'),
        api.get('/tenant/me'),
      ]);
      setPet(petRes.data);
      setAppointments(apptRes.data);
      const allRecords = mrRes.data;
      setMedicalRecords(allRecords.filter(r => r.record_type !== 'vaccination'));
      setVaccinations(allRecords.filter(r => r.record_type === 'vaccination'));
      setPrescriptions(rxRes.data);
      setReports(repRes.data);
      setDoctors(docRes.data);
      setServices(svcRes.data);
      setTenant(tenantRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [petId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Appointment expand/collapse ──
  const toggleApptExpand = async (apptId) => {
    if (expandedAppt === apptId) {
      setExpandedAppt(null);
      return;
    }
    setExpandedAppt(apptId);
    if (!apptDetails[apptId]) {
      try {
        const res = await api.get(`/appointments/${apptId}/details`);
        setApptDetails(prev => ({ ...prev, [apptId]: res.data }));
      } catch (err) {
        console.error(err);
      }
    }
  };

  // ── Photo upload ──
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(`/pets/${petId}/upload?file_type=photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPet(prev => ({ ...prev, photo_url: res.data.url }));
      toast.success('Photo uploaded');
    } catch (err) { toast.error('Upload failed'); }
    setUploading(false);
  };

  // ── General doc upload ──
  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(`/pets/${petId}/upload?file_type=document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await api.post('/reports', {
        patient_id: pet.owner_id, pet_id: petId,
        title: file.name, report_type: 'other',
        description: `Uploaded document: ${file.name}`,
        file_url: res.data.url,
        report_date: new Date().toISOString().split('T')[0],
      });
      toast.success('Document uploaded');
      fetchData();
    } catch (err) { toast.error('Upload failed'); }
    setUploading(false);
  };

  // ── Appointment doc upload ──
  const handleApptDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadApptId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(`/pets/${petId}/upload?file_type=document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await api.post('/reports', {
        patient_id: pet.owner_id, pet_id: petId, appointment_id: uploadApptId,
        title: file.name, report_type: 'other',
        description: `Uploaded: ${file.name}`,
        file_url: res.data.url,
        report_date: new Date().toISOString().split('T')[0],
      });
      toast.success('Document attached to appointment');
      // Refresh details for this appointment
      const detailRes = await api.get(`/appointments/${uploadApptId}/details`);
      setApptDetails(prev => ({ ...prev, [uploadApptId]: detailRes.data }));
      fetchData();
    } catch (err) { toast.error('Upload failed'); }
    setUploading(false);
    setUploadApptId(null);
  };

  // ── Edit pet ──
  const handleEditPet = () => {
    setEditForm({
      name: pet.name || '', species: pet.species || '', breed: pet.breed || '',
      gender: pet.gender || '', weight: pet.weight || '', color: pet.color || '',
      date_of_birth: pet.date_of_birth || '', microchip_id: pet.microchip_id || '',
      vaccination_status: pet.vaccination_status || '', notes: pet.notes || '',
    });
    setEditOpen(true);
  };
  const savePetEdit = async () => {
    setSaving(true);
    try {
      const payload = { ...editForm };
      if (payload.weight) payload.weight = parseFloat(payload.weight);
      else delete payload.weight;
      await api.put(`/pets/${petId}`, payload);
      toast.success('Pet details updated');
      setEditOpen(false);
      fetchData();
    } catch (err) { toast.error('Failed to update'); }
    setSaving(false);
  };

  // ── Fetch doctor services when doctor selected ──
  useEffect(() => {
    if (!apptForm.doctor_id) { setDoctorSvcs([]); return; }
    api.get('/services', { params: { doctor_id: apptForm.doctor_id } }).then(res => {
      const docSvcs = res.data;
      const generalSvcs = services.filter(s => !s.doctor_id);
      const combined = [...docSvcs];
      generalSvcs.forEach(gs => { if (!combined.find(s => s.id === gs.id)) combined.push(gs); });
      setDoctorSvcs(combined);
    }).catch(() => setDoctorSvcs(services));
  }, [apptForm.doctor_id, services]);

  // ── Fetch available slots when doctor + date selected ──
  useEffect(() => {
    if (!apptForm.doctor_id || !apptForm.date) { setApptSlots([]); return; }
    const svc = doctorSvcs.find(s => s.id === apptForm.service_id);
    const duration = svc?.duration_minutes || 30;
    setLoadingSlots(true);
    api.get('/appointments/available-slots', {
      params: { doctor_id: apptForm.doctor_id, date: apptForm.date, duration }
    }).then(res => setApptSlots(res.data)).catch(() => setApptSlots([]));
    setLoadingSlots(false);
  }, [apptForm.doctor_id, apptForm.date, apptForm.service_id, doctorSvcs]);

  // ── Create appointment ──
  const saveNewAppointment = async () => {
    if (!selectedSlot) return;
    setSaving(true);
    try {
      const svc = doctorSvcs.find(s => s.id === apptForm.service_id);
      const duration = svc?.duration_minutes || 30;
      const startDt = new Date(`${apptForm.date}T${selectedSlot.start_time}`);
      const endDt = new Date(startDt.getTime() + duration * 60000);
      await api.post('/appointments', {
        doctor_id: apptForm.doctor_id,
        patient_id: pet.owner_id,
        pet_id: petId,
        service_id: apptForm.service_id || undefined,
        start_time: startDt.toISOString(),
        end_time: endDt.toISOString(),
        notes: apptForm.notes || undefined,
      });
      toast.success('Appointment created');
      setCreateApptOpen(false);
      setApptForm({ doctor_id: '', service_id: '', date: '', start_time: '', notes: '' });
      setSelectedSlot(null);
      setApptSlots([]);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to create'); }
    setSaving(false);
  };

  // ── Edit appointment ──
  const openEditAppt = (a) => {
    setEditApptForm({ id: a.id, status: a.status, notes: a.notes || '' });
    setEditApptOpen(true);
  };
  const saveEditAppt = async () => {
    setSaving(true);
    try {
      await api.put(`/appointments/${editApptForm.id}`, {
        status: editApptForm.status,
        notes: editApptForm.notes,
      });
      toast.success('Appointment updated');
      setEditApptOpen(false);
      fetchData();
    } catch (err) { toast.error('Failed to update'); }
    setSaving(false);
  };

  // ── Medical record ──
  const saveMedicalRecord = async () => {
    setSaving(true);
    try {
      await api.post('/medical-records', {
        patient_id: pet.owner_id, pet_id: petId, ...mrForm,
        record_date: new Date().toISOString().split('T')[0],
      });
      toast.success('Medical record added');
      setMrOpen(false);
      setMrForm({ title: '', record_type: 'consultation', diagnosis: '', treatment: '', description: '' });
      fetchData();
    } catch (err) { toast.error('Failed to add record'); }
    setSaving(false);
  };

  // ── Vaccination ──
  const saveVaccination = async () => {
    setSaving(true);
    try {
      await api.post('/medical-records', {
        patient_id: pet.owner_id, pet_id: petId, record_type: 'vaccination', ...vacForm,
        record_date: new Date().toISOString().split('T')[0],
      });
      toast.success('Vaccination record added');
      setVacOpen(false);
      setVacForm({ title: '', description: '', treatment: '' });
      fetchData();
    } catch (err) { toast.error('Failed to add vaccination'); }
    setSaving(false);
  };

  // ── Report ──
  const saveReport = async () => {
    setSaving(true);
    try {
      await api.post('/reports', {
        patient_id: pet.owner_id, pet_id: petId, ...repForm,
        report_date: new Date().toISOString().split('T')[0],
      });
      toast.success('Report added');
      setRepOpen(false);
      setRepForm({ title: '', report_type: 'lab_result', description: '', file_url: '' });
      fetchData();
    } catch (err) { toast.error('Failed to add report'); }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Pet not found</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const owner = pet.owner;
  const isAdmin = profile?.role === 'admin';
  const canEdit = isAdmin || profile?.role === 'staff';

  const now = new Date();
  const upcomingAppts = appointments.filter(a => ['scheduled', 'confirmed', 'in_progress'].includes(a.status) && new Date(a.end_time || a.start_time) >= now);
  const pastAppts = appointments.filter(a => !upcomingAppts.includes(a));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <div className="relative group">
            {pet.photo_url ? (
              <img src={pet.photo_url} alt={pet.name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-200" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                <PawPrint className="h-7 w-7 text-amber-600" />
              </div>
            )}
            {canEdit && (
              <button onClick={() => photoInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-white" />
              </button>
            )}
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{pet.name}</h1>
              {canEdit && (
                <Button variant="ghost" size="sm" onClick={handleEditPet} className="gap-1 text-slate-500">
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </Button>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500 mt-0.5 flex-wrap">
              {pet.species && <span className="capitalize">{pet.species}</span>}
              {pet.breed && <span>{pet.breed}</span>}
              {pet.gender && <span className="capitalize">{pet.gender}</span>}
              {pet.date_of_birth && <span>{petAge(pet.date_of_birth)} old</span>}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview" className="gap-1.5"><PawPrint className="h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="appointments" className="gap-1.5"><Calendar className="h-4 w-4" /> Appointments</TabsTrigger>
          <TabsTrigger value="medical" className="gap-1.5"><ClipboardList className="h-4 w-4" /> Medical History</TabsTrigger>
          <TabsTrigger value="vaccinations" className="gap-1.5"><Syringe className="h-4 w-4" /> Vaccinations</TabsTrigger>
          <TabsTrigger value="prescriptions" className="gap-1.5"><Pill className="h-4 w-4" /> Prescriptions</TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5"><FileText className="h-4 w-4" /> Reports & Docs</TabsTrigger>
        </TabsList>

        {/* ==================== OVERVIEW TAB ==================== */}
        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="rounded-xl border-slate-200/60">
              <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-primary/10">
                    <p className="text-2xl font-bold text-primary">{appointments.length}</p>
                    <p className="text-xs text-slate-500 mt-1">Total Visits</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-emerald-50">
                    <p className="text-2xl font-bold text-emerald-700">{prescriptions.filter(p => p.is_active).length}</p>
                    <p className="text-xs text-slate-500 mt-1">Active Prescriptions</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-violet-50">
                    <p className="text-2xl font-bold text-violet-700">{medicalRecords.length}</p>
                    <p className="text-xs text-slate-500 mt-1">Medical Records</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-amber-50">
                    <p className="text-2xl font-bold text-amber-700">{vaccinations.length}</p>
                    <p className="text-xs text-slate-500 mt-1">Vaccinations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-slate-200/60">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><PawPrint className="h-4 w-4 text-primary" /> Pet Details</CardTitle></CardHeader>
              <CardContent className="space-y-2.5">
                <InfoRow label="Name" value={pet.name} />
                <InfoRow label="Species" value={pet.species} />
                <InfoRow label="Breed" value={pet.breed} />
                <InfoRow label="Gender" value={pet.gender} />
                <InfoRow label="Age" value={petAge(pet.date_of_birth)} />
                <InfoRow label="Date of Birth" value={pet.date_of_birth} />
                <InfoRow label="Weight" value={pet.weight ? `${pet.weight} kg` : null} />
                <InfoRow label="Color" value={pet.color} />
                <InfoRow label="Microchip ID" value={pet.microchip_id} />
                <InfoRow label="Vaccination Status" value={pet.vaccination_status} />
                {pet.notes && <div className="text-sm"><span className="text-slate-500">Notes</span><p className="text-slate-900 mt-1">{pet.notes}</p></div>}
              </CardContent>
            </Card>
            {owner && (
              <Card className="rounded-xl border-slate-200/60 md:col-span-2">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Owner Details</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <OwnerField icon={<User className="h-4 w-4 text-slate-400" />} label="Name" value={owner.full_name} />
                    <OwnerField icon={<Phone className="h-4 w-4 text-slate-400" />} label="Phone" value={owner.phone} />
                    <OwnerField icon={<Mail className="h-4 w-4 text-slate-400" />} label="Email" value={owner.email} />
                    <OwnerField icon={<MapPin className="h-4 w-4 text-slate-400" />} label="Address" value={owner.address} />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ==================== APPOINTMENTS TAB ==================== */}
        <TabsContent value="appointments">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-700">All Appointments</h3>
            {canEdit && (
              <Button size="sm" onClick={() => setCreateApptOpen(true)} className="gap-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="h-4 w-4" /> New Appointment
              </Button>
            )}
          </div>

          <input ref={apptDocRef} type="file" className="hidden" onChange={handleApptDocUpload} />

          {/* Upcoming */}
          {upcomingAppts.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Upcoming</h4>
              <div className="space-y-2">
                {upcomingAppts.map(a => (
                  <AppointmentCard key={a.id} a={a} expanded={expandedAppt === a.id}
                    onToggle={() => toggleApptExpand(a.id)} details={apptDetails[a.id]}
                    canEdit={canEdit} onEdit={() => openEditAppt(a)}
                    onUploadDoc={() => { setUploadApptId(a.id); apptDocRef.current?.click(); }}
                    uploading={uploading} isUpcoming tenant={tenant} doctors={doctors} pet={pet} />
                ))}
              </div>
            </div>
          )}

          {/* Past */}
          <div>
            {upcomingAppts.length > 0 && <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Past</h4>}
            {pastAppts.length === 0 && upcomingAppts.length === 0 ? (
              <Card className="rounded-xl border-slate-200/60">
                <CardContent className="py-12 text-center text-slate-400">No appointments found</CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {pastAppts.map(a => (
                  <AppointmentCard key={a.id} a={a} expanded={expandedAppt === a.id}
                    onToggle={() => toggleApptExpand(a.id)} details={apptDetails[a.id]}
                    canEdit={canEdit} onEdit={() => openEditAppt(a)}
                    onUploadDoc={() => { setUploadApptId(a.id); apptDocRef.current?.click(); }}
                    uploading={uploading} tenant={tenant} doctors={doctors} pet={pet} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ==================== MEDICAL HISTORY TAB ==================== */}
        <TabsContent value="medical">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-700">Medical History</h3>
            {canEdit && (
              <Button size="sm" onClick={() => setMrOpen(true)} className="gap-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="h-4 w-4" /> Add Record
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {medicalRecords.length === 0 ? (
              <Card className="rounded-xl border-slate-200/60"><CardContent className="py-12 text-center text-slate-400">No medical records found</CardContent></Card>
            ) : medicalRecords.map(r => (
              <Card key={r.id} className="rounded-xl border-slate-200/60">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-slate-900">{r.title}</h4>
                        {r.record_type && <Badge variant="outline" className="text-xs capitalize">{r.record_type}</Badge>}
                      </div>
                      {r.diagnosis && <p className="text-sm text-slate-600 mt-1"><span className="font-medium">Diagnosis:</span> {r.diagnosis}</p>}
                      {r.treatment && <p className="text-sm text-slate-600 mt-1"><span className="font-medium">Treatment:</span> {r.treatment}</p>}
                      {r.description && <p className="text-sm text-slate-500 mt-1">{r.description}</p>}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{r.record_date ? format(parseISO(r.record_date), 'MMM d, yyyy') : ''}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ==================== VACCINATIONS TAB ==================== */}
        <TabsContent value="vaccinations">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-700">Vaccination History</h3>
            {canEdit && (
              <Button size="sm" onClick={() => setVacOpen(true)} className="gap-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="h-4 w-4" /> Add Vaccination
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {vaccinations.length === 0 ? (
              <Card className="rounded-xl border-slate-200/60"><CardContent className="py-12 text-center text-slate-400">No vaccination records found</CardContent></Card>
            ) : vaccinations.map(v => (
              <Card key={v.id} className="rounded-xl border-slate-200/60">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Syringe className="h-4 w-4 text-emerald-600" />
                        <h4 className="text-sm font-semibold text-slate-900">{v.title}</h4>
                      </div>
                      {v.treatment && <p className="text-sm text-slate-600 mt-1"><span className="font-medium">Vaccine:</span> {v.treatment}</p>}
                      {v.description && <p className="text-sm text-slate-500 mt-1">{v.description}</p>}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{v.record_date ? format(parseISO(v.record_date), 'MMM d, yyyy') : ''}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ==================== PRESCRIPTIONS TAB ==================== */}
        <TabsContent value="prescriptions">
          <div className="space-y-3">
            {prescriptions.length === 0 ? (
              <Card className="rounded-xl border-slate-200/60"><CardContent className="py-12 text-center text-slate-400">No prescriptions found</CardContent></Card>
            ) : prescriptions.map(rx => (
              <Card key={rx.id} className="rounded-xl border-slate-200/60">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge className={`rounded-full text-xs ${rx.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {rx.is_active ? 'Active' : 'Completed'}
                      </Badge>
                      {rx.medications && (
                        <div className="mt-2 space-y-1">
                          {rx.medications.map((m, i) => (
                            <p key={i} className="text-sm text-slate-700">
                              <span className="font-medium">{m.name}</span>
                              {m.dosage && ` - ${m.dosage}`}
                              {m.frequency && ` (${m.frequency})`}
                              {m.duration && ` for ${m.duration}`}
                            </p>
                          ))}
                        </div>
                      )}
                      {rx.notes && <p className="text-sm text-slate-500 mt-1">{rx.notes}</p>}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{rx.prescribed_date ? format(parseISO(rx.prescribed_date), 'MMM d, yyyy') : ''}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ==================== REPORTS & DOCS TAB ==================== */}
        <TabsContent value="reports">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-700">Reports & Documents</h3>
            <div className="flex gap-2">
              {canEdit && (
                <>
                  <Button size="sm" variant="outline" onClick={() => docInputRef.current?.click()} className="gap-1" disabled={uploading}>
                    <Upload className="h-4 w-4" /> {uploading ? 'Uploading...' : 'Upload File'}
                  </Button>
                  <input ref={docInputRef} type="file" className="hidden" onChange={handleDocUpload} />
                  <Button size="sm" onClick={() => setRepOpen(true)} className="gap-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Plus className="h-4 w-4" /> Add Report
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.length === 0 ? (
              <Card className="rounded-xl border-slate-200/60 col-span-full"><CardContent className="py-12 text-center text-slate-400">No reports found</CardContent></Card>
            ) : reports.map(rep => (
              <Card key={rep.id} className="rounded-xl border-slate-200/60 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {rep.report_type && <Badge variant="outline" className="text-xs capitalize">{rep.report_type?.replace('_', ' ')}</Badge>}
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900">{rep.title}</h4>
                  {rep.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{rep.description}</p>}
                  <p className="text-xs text-slate-400 mt-2">{rep.report_date ? format(parseISO(rep.report_date), 'MMM d, yyyy') : ''}</p>
                  {rep.file_url && (
                    <a href={rep.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> View Document
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ==================== DIALOGS ==================== */}

      {/* Edit Pet */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Pet Details</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="mt-1" /></div>
              <div><Label>Species</Label><Input value={editForm.species || ''} onChange={e => setEditForm(f => ({ ...f, species: e.target.value }))} className="mt-1" placeholder="Dog, Cat, Bird..." /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Breed</Label><Input value={editForm.breed || ''} onChange={e => setEditForm(f => ({ ...f, breed: e.target.value }))} className="mt-1" /></div>
              <div>
                <Label>Gender</Label>
                <Select value={editForm.gender || ''} onValueChange={v => setEditForm(f => ({ ...f, gender: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Weight (kg)</Label><Input type="number" step="0.1" value={editForm.weight || ''} onChange={e => setEditForm(f => ({ ...f, weight: e.target.value }))} className="mt-1" /></div>
              <div><Label>Color</Label><Input value={editForm.color || ''} onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date of Birth</Label><Input type="date" value={editForm.date_of_birth || ''} onChange={e => setEditForm(f => ({ ...f, date_of_birth: e.target.value }))} className="mt-1" /></div>
              <div><Label>Microchip ID</Label><Input value={editForm.microchip_id || ''} onChange={e => setEditForm(f => ({ ...f, microchip_id: e.target.value }))} className="mt-1" /></div>
            </div>
            <div><Label>Vaccination Status</Label><Input value={editForm.vaccination_status || ''} onChange={e => setEditForm(f => ({ ...f, vaccination_status: e.target.value }))} className="mt-1" /></div>
            <div><Label>Notes</Label><Input value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={savePetEdit} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Appointment */}
      <Dialog open={createApptOpen} onOpenChange={(v) => { if (!v) { setSelectedSlot(null); setApptSlots([]); } setCreateApptOpen(v); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Appointment for {pet.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Doctor *</Label>
              <Select value={apptForm.doctor_id} onValueChange={v => { setApptForm(f => ({ ...f, doctor_id: v, service_id: '' })); setSelectedSlot(null); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent>{doctors.filter(d => d.is_active).map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    <span className="flex items-center gap-2">
                      {d.color && <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: d.color }} />}
                      {d.full_name}
                      {d.specialization && <span className="text-slate-400 text-xs">· {d.specialization}</span>}
                    </span>
                  </SelectItem>
                ))}</SelectContent>
              </Select>
            </div>
            {apptForm.doctor_id && (
              <div>
                <Label>Service</Label>
                <Select value={apptForm.service_id} onValueChange={v => { setApptForm(f => ({ ...f, service_id: v })); setSelectedSlot(null); }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select service" /></SelectTrigger>
                  <SelectContent>{doctorSvcs.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min{s.price > 0 ? ` · ₹${s.price}` : ''})</SelectItem>
                  ))}</SelectContent>
                </Select>
              </div>
            )}
            {apptForm.doctor_id && (
              <div>
                <Label>Date *</Label>
                <Input type="date" value={apptForm.date} min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => { setApptForm(f => ({ ...f, date: e.target.value })); setSelectedSlot(null); }} className="mt-1" />
              </div>
            )}
            {apptForm.doctor_id && apptForm.date && (
              <div>
                <Label className="flex items-center gap-1.5 text-sm font-medium">Available Slots</Label>
                {loadingSlots ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : apptSlots.filter(s => s.available).length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-3">No available slots for this date</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 mt-2 max-h-40 overflow-y-auto">
                    {apptSlots.filter(s => s.available).map((slot, i) => (
                      <button key={i} onClick={() => setSelectedSlot(slot)}
                        className={`py-2 px-1 rounded-md text-sm font-medium text-center border transition-colors ${
                          selectedSlot?.start_time === slot.start_time
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-primary hover:bg-primary/5'
                        }`}>{slot.start_time}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div><Label>Notes</Label><Input value={apptForm.notes} onChange={e => setApptForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" placeholder="Any special instructions..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateApptOpen(false)}>Cancel</Button>
            <Button onClick={saveNewAppointment} disabled={saving || !apptForm.doctor_id || !apptForm.date || !selectedSlot}
              className="bg-primary hover:bg-primary/90 text-primary-foreground">{saving ? 'Creating...' : 'Book Appointment'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment */}
      <Dialog open={editApptOpen} onOpenChange={setEditApptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Appointment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Status</Label>
              <Select value={editApptForm.status || ''} onValueChange={v => setEditApptForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Input value={editApptForm.notes || ''} onChange={e => setEditApptForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditApptOpen(false)}>Cancel</Button>
            <Button onClick={saveEditAppt} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">{saving ? 'Saving...' : 'Update'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Medical Record */}
      <Dialog open={mrOpen} onOpenChange={setMrOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Medical Record</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={mrForm.title} onChange={e => setMrForm(f => ({ ...f, title: e.target.value }))} className="mt-1" placeholder="e.g. Annual Checkup" /></div>
            <div>
              <Label>Type</Label>
              <Select value={mrForm.record_type} onValueChange={v => setMrForm(f => ({ ...f, record_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="diagnosis">Diagnosis</SelectItem>
                  <SelectItem value="procedure">Procedure</SelectItem>
                  <SelectItem value="surgery">Surgery</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Diagnosis</Label><Input value={mrForm.diagnosis} onChange={e => setMrForm(f => ({ ...f, diagnosis: e.target.value }))} className="mt-1" /></div>
            <div><Label>Treatment</Label><Input value={mrForm.treatment} onChange={e => setMrForm(f => ({ ...f, treatment: e.target.value }))} className="mt-1" /></div>
            <div><Label>Description</Label><Input value={mrForm.description} onChange={e => setMrForm(f => ({ ...f, description: e.target.value }))} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMrOpen(false)}>Cancel</Button>
            <Button onClick={saveMedicalRecord} disabled={saving || !mrForm.title} className="bg-primary hover:bg-primary/90 text-primary-foreground">{saving ? 'Saving...' : 'Add Record'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Vaccination */}
      <Dialog open={vacOpen} onOpenChange={setVacOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Vaccination Record</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Vaccine Name *</Label><Input value={vacForm.title} onChange={e => setVacForm(f => ({ ...f, title: e.target.value }))} className="mt-1" placeholder="e.g. Rabies Vaccine" /></div>
            <div><Label>Batch / Details</Label><Input value={vacForm.treatment} onChange={e => setVacForm(f => ({ ...f, treatment: e.target.value }))} className="mt-1" /></div>
            <div><Label>Notes</Label><Input value={vacForm.description} onChange={e => setVacForm(f => ({ ...f, description: e.target.value }))} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVacOpen(false)}>Cancel</Button>
            <Button onClick={saveVaccination} disabled={saving || !vacForm.title} className="bg-primary hover:bg-primary/90 text-primary-foreground">{saving ? 'Saving...' : 'Add Vaccination'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Report */}
      <Dialog open={repOpen} onOpenChange={setRepOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Report</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={repForm.title} onChange={e => setRepForm(f => ({ ...f, title: e.target.value }))} className="mt-1" /></div>
            <div>
              <Label>Type</Label>
              <Select value={repForm.report_type} onValueChange={v => setRepForm(f => ({ ...f, report_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lab_result">Lab Result</SelectItem>
                  <SelectItem value="imaging">Imaging</SelectItem>
                  <SelectItem value="pathology">Pathology</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Input value={repForm.description} onChange={e => setRepForm(f => ({ ...f, description: e.target.value }))} className="mt-1" /></div>
            <div><Label>File URL</Label><Input value={repForm.file_url} onChange={e => setRepForm(f => ({ ...f, file_url: e.target.value }))} className="mt-1" placeholder="Paste URL or upload via Reports tab" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepOpen(false)}>Cancel</Button>
            <Button onClick={saveReport} disabled={saving || !repForm.title} className="bg-primary hover:bg-primary/90 text-primary-foreground">{saving ? 'Saving...' : 'Add Report'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════════════ */

function AppointmentCard({ a, expanded, onToggle, details, canEdit, onEdit, onUploadDoc, uploading, isUpcoming, tenant, doctors, pet }) {
  const start = parseISO(a.start_time);
  const end = parseISO(a.end_time);
  const durationMin = Math.round((end - start) / 60000);
  const d = details || { medical_records: [], prescriptions: [], reports: [] };
  const isPastOrCompleted = !isUpcoming || a.status === 'completed';

  return (
    <Card className={`rounded-xl border-slate-200/60 ${isUpcoming ? 'border-l-4 border-l-primary' : ''}`}>
      <CardContent className="p-0">
        {/* Main row */}
        <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={onToggle}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-sm font-medium text-slate-900">{format(start, 'MMM d, yyyy')}</p>
              <p className="text-xs text-slate-500">{format(start, 'h:mm a')} – {format(end, 'h:mm a')} ({durationMin} min)</p>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-sm text-slate-600">{a.doctor?.full_name || '-'}</span>
              {a.service?.name && <span className="text-xs text-slate-400">• {a.service.name}</span>}
              {a.payment_status && (
                <Badge className={`rounded-full text-xs capitalize ${a.payment_status === 'paid' ? 'bg-green-100 text-green-700' : a.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                  {a.payment_status}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={`rounded-full text-xs capitalize ${STATUS_STYLES[a.status] || 'bg-slate-100'}`}>
              {a.status?.replace('_', ' ')}
            </Badge>
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); onEdit(); }} className="h-7 px-2 text-xs text-slate-500">
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
            {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="border-t border-slate-100 p-4 bg-slate-50/50 space-y-4">
            {a.notes && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Notes</p>
                <p className="text-sm text-slate-600">{a.notes}</p>
              </div>
            )}

            {/* Prescriptions */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-1"><Pill className="h-3 w-3" /> Prescriptions</p>
              {isUpcoming && a.status !== 'completed' ? (
                <p className="text-xs text-slate-400 italic">Prescription will be available after the consultation</p>
              ) : d.prescriptions.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No prescriptions for this visit</p>
              ) : d.prescriptions.map(rx => {
                const doctor = doctors?.find(doc => doc.id === rx.doctor_id);
                return (
                  <div key={rx.id} className="bg-white rounded-lg p-3 border border-slate-100 mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`rounded-full text-xs ${rx.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {rx.is_active ? 'Active' : 'Completed'}
                        </Badge>
                        {rx.prescribed_date && <span className="text-xs text-slate-400">{format(parseISO(rx.prescribed_date), 'MMM d, yyyy')}</span>}
                      </div>
                      {tenant && (
                        <DownloadPrescription
                          prescription={rx}
                          tenant={tenant}
                          doctor={doctor || a.doctor}
                          patient={a.patient}
                          pet={pet}
                          size="sm"
                        />
                      )}
                    </div>
                    {rx.diagnosis && <p className="text-xs text-slate-600 mb-1"><span className="font-medium">Diagnosis:</span> {rx.diagnosis}</p>}
                    {rx.medications?.map((m, i) => (
                      <p key={i} className="text-sm text-slate-700">
                        <span className="font-medium">{m.name}</span>
                        {m.dosage && ` – ${m.dosage}`}{m.frequency && ` (${m.frequency})`}{m.duration && ` for ${m.duration}`}
                      </p>
                    ))}
                    {rx.notes && <p className="text-xs text-slate-500 mt-1">{rx.notes}</p>}
                    {rx.advice && <p className="text-xs text-slate-500 mt-1"><span className="font-medium">Advice:</span> {rx.advice}</p>}
                    {rx.lab_advice && <p className="text-xs text-slate-500 mt-1"><span className="font-medium">Lab:</span> {rx.lab_advice}</p>}
                  </div>
                );
              })}
            </div>

            {/* Reports & documents */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-1"><FileText className="h-3 w-3" /> Reports & Documents</p>
              {d.reports.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No documents for this visit</p>
              ) : d.reports.map(rep => (
                <div key={rep.id} className="bg-white rounded-lg p-3 border border-slate-100 mb-2 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{rep.title}</span>
                      {rep.report_type && <Badge variant="outline" className="text-xs capitalize">{rep.report_type.replace('_', ' ')}</Badge>}
                    </div>
                    {rep.description && <p className="text-xs text-slate-500 mt-0.5">{rep.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {rep.file_url && (
                      <>
                        <a href={rep.file_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" /> Open
                        </a>
                        <a href={rep.file_url} download className="text-xs text-slate-500 hover:underline flex items-center gap-1">
                          <Download className="h-3 w-3" /> Download
                        </a>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Medical records */}
            {d.medical_records.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-1"><ClipboardList className="h-3 w-3" /> Medical Records</p>
                {d.medical_records.map(r => (
                  <div key={r.id} className="bg-white rounded-lg p-3 border border-slate-100 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{r.title}</span>
                      {r.record_type && <Badge variant="outline" className="text-xs capitalize">{r.record_type}</Badge>}
                    </div>
                    {r.diagnosis && <p className="text-xs text-slate-600 mt-1"><span className="font-medium">Diagnosis:</span> {r.diagnosis}</p>}
                    {r.treatment && <p className="text-xs text-slate-600 mt-1"><span className="font-medium">Treatment:</span> {r.treatment}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            {canEdit && !isUpcoming && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={onUploadDoc} disabled={uploading} className="gap-1 text-xs">
                  <Paperclip className="h-3 w-3" /> {uploading ? 'Uploading...' : 'Attach Document'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900 capitalize">{value}</span>
    </div>
  );
}

function OwnerField({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value || '-'}</p>
      </div>
    </div>
  );
}

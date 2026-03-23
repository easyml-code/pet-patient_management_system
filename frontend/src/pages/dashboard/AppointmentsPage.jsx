import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Search, ChevronLeft, ChevronRight, CalendarCheck, Plus, MoreHorizontal,
  Edit2, PlayCircle, Download, Phone, UserPlus, PawPrint, CheckCircle2, Loader2, Clock,
  Activity, ClipboardList, Zap
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import DownloadPrescription from '@/components/DownloadPrescription';

const PAGE_SIZE = 20;

const STATUS_STYLES = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-yellow-100 text-yellow-700',
};

export default function AppointmentsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isPetClinic, setIsPetClinic] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create appointment — multi-step
  const [createOpen, setCreateOpen] = useState(false);
  const [bookStep, setBookStep] = useState(1); // 1=phone, 2=patient/pet, 3=doctor/service/slot
  const [phoneLookup, setPhoneLookup] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [foundPatient, setFoundPatient] = useState(null);
  const [foundPets, setFoundPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [creatingPet, setCreatingPet] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({
    full_name: '', phone: '', email: '', gender: '', address: '',
    date_of_birth: '', blood_group: '', allergies: '', chronic_conditions: '',
    emergency_contact_name: '', emergency_contact_phone: ''
  });
  const [newPetForm, setNewPetForm] = useState({ name: '', species: '', breed: '', gender: '', date_of_birth: '', weight: '', color: '', microchip_id: '', notes: '' });
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [doctorServices, setDoctorServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookNotes, setBookNotes] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('pending');

  // Two-path booking: null = show choice, 'register' = full form, 'quick' = minimal
  const [bookPath, setBookPath] = useState(null);

  // Quick book form state
  const [quickForm, setQuickForm] = useState({
    owner_name: '', owner_phone: '', pet_name: '', pet_type: '', reason: '',
    doctor_id: '', date: '', service_id: ''
  });
  const [quickSlots, setQuickSlots] = useState([]);
  const [quickSelectedSlot, setQuickSelectedSlot] = useState(null);
  const [loadingQuickSlots, setLoadingQuickSlots] = useState(false);
  const [quickDoctorSvcs, setQuickDoctorSvcs] = useState([]);

  // Edit appointment
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Download prescription state
  const [rxData, setRxData] = useState({});

  // Vitals state
  const [vitalsOpen, setVitalsOpen] = useState(false);
  const [vitalsAppt, setVitalsAppt] = useState(null);
  const [vitalsForm, setVitalsForm] = useState({ weight: '', temperature: '', heart_rate: '', respiratory_rate: '', blood_pressure: '', notes: '' });
  const [savingVitals, setSavingVitals] = useState(false);

  const isDoctor = profile?.role === 'doctor';
  const isAdmin = profile?.is_admin || profile?.role === 'admin';
  const isStaff = profile?.role === 'staff';
  const canCreate = isAdmin || isStaff || isDoctor;
  const canRecordVitals = isAdmin || isStaff;

  const search = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || 'all';
  const doctorFilter = searchParams.get('doctor_id') || 'all';
  const dateFilter = searchParams.get('date') || '';

  useEffect(() => {
    Promise.all([
      api.get('/doctors'),
      api.get('/tenant/me'),
      api.get('/services'),
    ]).then(([docRes, tenantRes, svcRes]) => {
      setDoctors(docRes.data);
      setTenant(tenantRes.data);
      setIsPetClinic(tenantRes.data?.type === 'pet_clinic');
      setServices(svcRes.data);
    }).catch(() => {});
  }, []);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { skip: page * PAGE_SIZE, limit: PAGE_SIZE + 1 };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (doctorFilter !== 'all') params.doctor_id = doctorFilter;
      if (dateFilter === 'today') {
        const today = format(new Date(), 'yyyy-MM-dd');
        params.date_from = `${today}T00:00:00`;
        params.date_to = `${today}T23:59:59`;
      } else if (dateFilter) {
        params.date_from = `${dateFilter}T00:00:00`;
        params.date_to = `${dateFilter}T23:59:59`;
      }
      const res = await api.get('/appointments', { params });
      setHasMore(res.data.length > PAGE_SIZE);
      setAppointments(res.data.slice(0, PAGE_SIZE));
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [search, statusFilter, doctorFilter, dateFilter, page]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
    setPage(0);
  };

  // ── Phone lookup ──
  const handlePhoneLookup = async () => {
    if (!phoneLookup || phoneLookup.length < 3) return;
    setLookingUp(true);
    try {
      const res = await api.get('/patients/lookup', { params: { phone: phoneLookup } });
      if (res.data.found) {
        setFoundPatient(res.data.patient);
        setFoundPets(res.data.pets || []);
        setCreatingPatient(false);
        setBookPath(null);
        if (!isPetClinic) {
          setBookStep(3);
        } else {
          setBookStep(2);
        }
      } else {
        // Not found — show two-path choice
        setFoundPatient(null);
        setFoundPets([]);
        setCreatingPatient(true);
        setBookPath(null); // will show choice cards
        setNewPatientForm(f => ({ ...f, phone: phoneLookup }));
        setQuickForm(f => ({ ...f, owner_phone: phoneLookup }));
        setBookStep(2);
      }
    } catch (e) {
      toast.error('Lookup failed');
    }
    setLookingUp(false);
  };

  // ── Create patient (Register Now path) ──
  const handleCreatePatient = async () => {
    setSaving(true);
    try {
      const payload = { ...newPatientForm, registration_status: 'registered' };
      // Clean empty strings
      Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });
      if (!payload.full_name) { toast.error('Full name is required'); setSaving(false); return; }
      if (!payload.phone) { toast.error('Phone is required'); setSaving(false); return; }
      const res = await api.post('/patients', payload);
      setFoundPatient(res.data);
      setFoundPets([]);
      setCreatingPatient(false);
      toast.success('Patient registered');
      if (isPetClinic) {
        setCreatingPet(true);
      } else {
        setBookStep(3);
      }
    } catch (e) {
      toast.error('Failed to create patient');
    }
    setSaving(false);
  };

  // ── Create pet ──
  const handleCreatePet = async () => {
    if (!foundPatient) return;
    setSaving(true);
    try {
      const petData = { owner_id: foundPatient.id, name: newPetForm.name, species: newPetForm.species || undefined };
      if (newPetForm.breed) petData.breed = newPetForm.breed;
      if (newPetForm.gender) petData.gender = newPetForm.gender;
      if (newPetForm.date_of_birth) petData.date_of_birth = newPetForm.date_of_birth;
      if (newPetForm.weight) petData.weight = parseFloat(newPetForm.weight);
      if (newPetForm.color) petData.color = newPetForm.color;
      if (newPetForm.microchip_id) petData.microchip_id = newPetForm.microchip_id;
      if (newPetForm.notes) petData.notes = newPetForm.notes;
      const res = await api.post('/pets', petData);
      const pet = res.data;
      setFoundPets(prev => [...prev, pet]);
      setSelectedPet(pet);
      setCreatingPet(false);
      toast.success('Pet added');
      setBookStep(3);
    } catch (e) {
      toast.error('Failed to add pet');
    }
    setSaving(false);
  };

  // ── Quick book: fetch doctor services ──
  useEffect(() => {
    if (!quickForm.doctor_id) { setQuickDoctorSvcs([]); return; }
    api.get('/services', { params: { doctor_id: quickForm.doctor_id } })
      .then(res => {
        const docSvcs = res.data;
        const generalSvcs = services.filter(s => !s.doctor_id);
        const combined = [...docSvcs];
        generalSvcs.forEach(gs => { if (!combined.find(s => s.id === gs.id)) combined.push(gs); });
        setQuickDoctorSvcs(combined);
      })
      .catch(() => setQuickDoctorSvcs(services));
  }, [quickForm.doctor_id, services]);

  // ── Quick book: fetch available slots ──
  useEffect(() => {
    if (!quickForm.doctor_id || !quickForm.date) { setQuickSlots([]); return; }
    const svc = quickDoctorSvcs.find(s => s.id === quickForm.service_id);
    const duration = svc?.duration_minutes || 30;
    setLoadingQuickSlots(true);
    api.get('/appointments/available-slots', {
      params: { doctor_id: quickForm.doctor_id, date: quickForm.date, duration }
    }).then(res => {
      setQuickSlots(res.data);
      setLoadingQuickSlots(false);
    }).catch(() => { setQuickSlots([]); setLoadingQuickSlots(false); });
  }, [quickForm.doctor_id, quickForm.date, quickForm.service_id, quickDoctorSvcs]);

  // ── Quick book submit ──
  const handleQuickBook = async () => {
    if (!quickForm.owner_name || !quickForm.owner_phone || !quickForm.doctor_id || !quickSelectedSlot) return;
    if (isPetClinic && (!quickForm.pet_name || !quickForm.pet_type)) return;
    setSaving(true);
    try {
      const svc = quickDoctorSvcs.find(s => s.id === quickForm.service_id);
      const duration = svc?.duration_minutes || 30;
      const startDt = new Date(`${quickForm.date}T${quickSelectedSlot.start_time}`);
      const endDt = new Date(startDt.getTime() + duration * 60000);
      const payload = {
        owner_name: quickForm.owner_name,
        owner_phone: quickForm.owner_phone,
        pet_name: quickForm.pet_name || 'N/A',
        pet_type: quickForm.pet_type || 'other',
        reason: quickForm.reason || undefined,
        doctor_id: quickForm.doctor_id,
        start_time: startDt.toISOString(),
        end_time: endDt.toISOString(),
        service_id: quickForm.service_id || undefined,
      };
      await api.post('/appointments/quick-book', payload);
      toast.success('Appointment quick-booked! Patient registration pending.');
      resetBookingForm();
      setCreateOpen(false);
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to quick book');
    }
    setSaving(false);
  };

  // ── Fetch doctor's services (for step 3) ──
  useEffect(() => {
    if (!selectedDoctor) { setDoctorServices([]); return; }
    api.get('/services', { params: { doctor_id: selectedDoctor } })
      .then(res => {
        const docSvcs = res.data;
        const generalSvcs = services.filter(s => !s.doctor_id);
        const combined = [...docSvcs];
        generalSvcs.forEach(gs => {
          if (!combined.find(s => s.id === gs.id)) combined.push(gs);
        });
        setDoctorServices(combined);
      })
      .catch(() => setDoctorServices(services));
  }, [selectedDoctor, services]);

  // ── Fetch available slots (for step 3) ──
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) { setAvailableSlots([]); return; }
    const svc = doctorServices.find(s => s.id === selectedService);
    const duration = svc?.duration_minutes || 30;
    setLoadingSlots(true);
    api.get('/appointments/available-slots', {
      params: { doctor_id: selectedDoctor, date: selectedDate, duration }
    }).then(res => {
      setAvailableSlots(res.data);
      setLoadingSlots(false);
    }).catch(() => { setAvailableSlots([]); setLoadingSlots(false); });
  }, [selectedDoctor, selectedDate, selectedService, doctorServices]);

  // ── Book appointment ──
  const handleBook = async () => {
    if (!foundPatient || !selectedDoctor || !selectedSlot) return;
    setSaving(true);
    try {
      const svc = doctorServices.find(s => s.id === selectedService);
      const duration = svc?.duration_minutes || 30;
      const startDt = new Date(`${selectedDate}T${selectedSlot.start_time}`);
      const endDt = new Date(startDt.getTime() + duration * 60000);
      const payload = {
        doctor_id: selectedDoctor,
        patient_id: foundPatient.id,
        pet_id: selectedPet?.id || undefined,
        service_id: selectedService || undefined,
        start_time: startDt.toISOString(),
        end_time: endDt.toISOString(),
        notes: bookNotes || undefined,
        payment_status: paymentStatus,
      };
      if (paymentAmount) payload.payment_amount = parseFloat(paymentAmount);
      if (paymentMethod) payload.payment_method = paymentMethod;
      await api.post('/appointments', payload);
      toast.success('Appointment booked');
      resetBookingForm();
      setCreateOpen(false);
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to book');
    }
    setSaving(false);
  };

  const resetBookingForm = () => {
    setBookStep(1);
    setBookPath(null);
    setPhoneLookup('');
    setFoundPatient(null);
    setFoundPets([]);
    setSelectedPet(null);
    setCreatingPatient(false);
    setCreatingPet(false);
    setNewPatientForm({ full_name: '', phone: '', email: '', gender: '', address: '', date_of_birth: '', blood_group: '', allergies: '', chronic_conditions: '', emergency_contact_name: '', emergency_contact_phone: '' });
    setNewPetForm({ name: '', species: '', breed: '', gender: '', date_of_birth: '', weight: '', color: '', microchip_id: '', notes: '' });
    setSelectedDoctor('');
    setSelectedService('');
    setSelectedDate('');
    setAvailableSlots([]);
    setSelectedSlot(null);
    setBookNotes('');
    setPaymentAmount('');
    setPaymentMethod('');
    setPaymentStatus('pending');
    setQuickForm({ owner_name: '', owner_phone: '', pet_name: '', pet_type: '', reason: '', doctor_id: '', date: '', service_id: '' });
    setQuickSlots([]);
    setQuickSelectedSlot(null);
    setQuickDoctorSvcs([]);
  };

  // ── Edit handlers ──
  const openEdit = (a) => {
    setEditForm({
      id: a.id,
      status: a.status,
      doctor_id: a.doctor_id,
      date: format(parseISO(a.start_time), 'yyyy-MM-dd'),
      start_time: format(parseISO(a.start_time), 'HH:mm'),
      end_time: format(parseISO(a.end_time), 'HH:mm'),
      notes: a.notes || '',
      payment_amount: a.payment_amount || '',
      payment_method: a.payment_method || '',
      payment_status: a.payment_status || 'pending',
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    setSaving(true);
    try {
      const payload = {
        status: editForm.status,
        doctor_id: editForm.doctor_id,
        notes: editForm.notes,
        payment_status: editForm.payment_status,
      };
      if (editForm.date && editForm.start_time) {
        payload.start_time = new Date(`${editForm.date}T${editForm.start_time}`).toISOString();
      }
      if (editForm.date && editForm.end_time) {
        payload.end_time = new Date(`${editForm.date}T${editForm.end_time}`).toISOString();
      }
      if (editForm.payment_amount) payload.payment_amount = parseFloat(editForm.payment_amount);
      if (editForm.payment_method) payload.payment_method = editForm.payment_method;
      await api.put(`/appointments/${editForm.id}`, payload);
      toast.success('Appointment updated');
      setEditOpen(false);
      fetchAppointments();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to update'); }
    setSaving(false);
  };

  const handleInitiate = async (appt) => {
    if (!appt.vitals) {
      toast.error('Vitals must be recorded before initiating');
      return;
    }
    try {
      await api.post(`/appointments/${appt.id}/initiate`);
      toast.success('Appointment initiated');
      navigate(`/dashboard/appointments/${appt.id}/consult`);
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to initiate'); }
  };

  // ── Vitals handlers ──
  const openVitals = (appt) => {
    setVitalsAppt(appt);
    const existing = appt.vitals || {};
    setVitalsForm({
      weight: existing.weight || '',
      temperature: existing.temperature || '',
      heart_rate: existing.heart_rate || '',
      respiratory_rate: existing.respiratory_rate || '',
      blood_pressure: existing.blood_pressure || '',
      notes: existing.notes || '',
    });
    setVitalsOpen(true);
  };

  const handleSaveVitals = async () => {
    if (!vitalsAppt) return;
    setSavingVitals(true);
    try {
      const payload = {};
      if (vitalsForm.weight) payload.weight = parseFloat(vitalsForm.weight);
      if (vitalsForm.temperature) payload.temperature = parseFloat(vitalsForm.temperature);
      if (vitalsForm.heart_rate) payload.heart_rate = parseInt(vitalsForm.heart_rate);
      if (vitalsForm.respiratory_rate) payload.respiratory_rate = parseInt(vitalsForm.respiratory_rate);
      if (vitalsForm.blood_pressure) payload.blood_pressure = vitalsForm.blood_pressure;
      if (vitalsForm.notes) payload.notes = vitalsForm.notes;
      await api.post(`/appointments/${vitalsAppt.id}/vitals`, payload);
      toast.success('Vitals recorded');
      setVitalsOpen(false);
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to record vitals');
    }
    setSavingVitals(false);
  };

  const fetchRxForDownload = async (appt) => {
    if (rxData[appt.id]) return rxData[appt.id];
    try {
      const res = await api.get(`/appointments/${appt.id}/details`);
      const data = res.data;
      setRxData(prev => ({ ...prev, [appt.id]: data }));
      return data;
    } catch { return null; }
  };

  const colSpan = isPetClinic ? 9 : 7;

  return (
    <div data-testid="appointments-page" className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Appointments</h1>
          <p className="text-sm text-slate-500 mt-1">View and manage all bookings</p>
        </div>
        {canCreate && (
          <Button onClick={() => { resetBookingForm(); setCreateOpen(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Appointment
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="rounded-xl border-slate-200/60">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder={isPetClinic ? "Search by pet, owner or doctor name..." : "Search by patient or doctor name..."} value={search}
                onChange={e => updateParam('search', e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={v => updateParam('status', v)}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no_show">No Show</SelectItem>
              </SelectContent>
            </Select>
            <Select value={doctorFilter} onValueChange={v => updateParam('doctor_id', v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Doctor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doctors</SelectItem>
                {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFilter === 'today' ? format(new Date(), 'yyyy-MM-dd') : dateFilter}
              onChange={e => updateParam('date', e.target.value)} className="w-[160px]" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date / Time</TableHead>
                {isPetClinic ? (
                  <>
                    <TableHead>Patient (Pet)</TableHead>
                    <TableHead className="hidden md:table-cell">Type</TableHead>
                    <TableHead className="hidden md:table-cell">Owner</TableHead>
                  </>
                ) : (
                  <TableHead>Patient</TableHead>
                )}
                <TableHead className="hidden md:table-cell">Doctor</TableHead>
                <TableHead className="hidden lg:table-cell">Service</TableHead>
                <TableHead className="hidden lg:table-cell">Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={colSpan} className="text-center py-12 text-slate-400">Loading...</TableCell></TableRow>
              ) : appointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="text-center py-12">
                    <CalendarCheck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400">No appointments found</p>
                  </TableCell>
                </TableRow>
              ) : appointments.map(a => {
                const start = parseISO(a.start_time);
                const end = parseISO(a.end_time);
                const durationMin = Math.round((end - start) / 60000);
                const petName = a.pet?.name;
                const petSpecies = a.pet?.species;
                const ownerName = a.pet?.owner?.full_name || a.patient?.full_name;
                const detailLink = isPetClinic && a.pet_id
                  ? `/dashboard/pets/${a.pet_id}`
                  : `/dashboard/patients/${a.patient_id}`;
                const canInitiate = isDoctor && (a.status === 'scheduled' || a.status === 'confirmed');
                const isCompleted = a.status === 'completed';
                const isInProgress = a.status === 'in_progress';
                const isScheduledOrConfirmed = a.status === 'scheduled' || a.status === 'confirmed';
                const hasVitals = !!a.vitals;
                const pendingReg = a.patient?.registration_status === 'pending';

                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <p className="text-sm font-medium text-slate-900">{format(start, 'MMM d, yyyy')}</p>
                      <p className="text-xs text-slate-500">{format(start, 'h:mm a')} – {format(end, 'h:mm a')}</p>
                    </TableCell>
                    {isPetClinic ? (
                      <>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Link to={detailLink} className="text-sm font-medium text-slate-900 hover:text-primary hover:underline">
                              {petName || a.patient?.full_name || '-'}
                            </Link>
                            {pendingReg && <Badge className="rounded-full text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700">Pending</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-slate-600 capitalize">{petSpecies || '-'}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-slate-600">{ownerName || '-'}</span>
                        </TableCell>
                      </>
                    ) : (
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Link to={detailLink} className="text-sm font-medium text-slate-900 hover:text-primary hover:underline">
                            {a.patient?.full_name || '-'}
                          </Link>
                          {pendingReg && <Badge className="rounded-full text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700">Pending</Badge>}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        {a.doctor?.color && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.doctor.color }} />}
                        <span className="text-sm text-slate-600">{a.doctor?.full_name || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-slate-500">{a.service?.name || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-slate-500">{durationMin} min</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge className={`rounded-full text-xs capitalize ${STATUS_STYLES[a.status] || 'bg-slate-100 text-slate-600'}`}>
                          {a.status?.replace('_', ' ')}
                        </Badge>
                        {isScheduledOrConfirmed && hasVitals && (
                          <Activity className="h-3.5 w-3.5 text-green-500" title="Vitals recorded" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(a)}>
                            <Edit2 className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          {/* Vitals: staff/admin can record on scheduled/confirmed */}
                          {canRecordVitals && isScheduledOrConfirmed && (
                            <DropdownMenuItem onClick={() => openVitals(a)}>
                              <Activity className="h-3.5 w-3.5 mr-2" />
                              {hasVitals ? 'Edit Vitals' : 'Record Vitals'}
                            </DropdownMenuItem>
                          )}
                          {/* Doctor initiate — gated on vitals */}
                          {canInitiate && (
                            <DropdownMenuItem
                              onClick={() => handleInitiate(a)}
                              disabled={!hasVitals}
                              className={!hasVitals ? 'opacity-50' : ''}
                            >
                              <PlayCircle className="h-3.5 w-3.5 mr-2" />
                              {hasVitals ? 'Initiate' : 'Initiate (Vitals Required)'}
                            </DropdownMenuItem>
                          )}
                          {isInProgress && isDoctor && (
                            <DropdownMenuItem onClick={() => navigate(`/dashboard/appointments/${a.id}/consult`)}>
                              <PlayCircle className="h-3.5 w-3.5 mr-2" /> Continue Consultation
                            </DropdownMenuItem>
                          )}
                          {isCompleted && (
                            <DropdownMenuItem onClick={async () => {
                              const data = await fetchRxForDownload(a);
                              if (data?.prescriptions?.length > 0) {
                                setRxData(prev => ({ ...prev, [`show_${a.id}`]: true }));
                              } else {
                                toast.info('No prescription found for this appointment');
                              }
                            }}>
                              <Download className="h-3.5 w-3.5 mr-2" /> Download Rx
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {rxData[`show_${a.id}`] && rxData[a.id]?.prescriptions?.[0] && (
                        <DownloadPrescription
                          prescription={rxData[a.id].prescriptions[0]}
                          tenant={tenant}
                          doctor={a.doctor}
                          patient={a.patient}
                          pet={a.pet}
                          size="sm"
                          variant="ghost"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {(page > 0 || hasMore) && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-slate-500">Page {page + 1}</span>
          <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage(p => p + 1)}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* ═══════ New Appointment — Multi-Step Dialog ═══════ */}
      <Dialog open={createOpen} onOpenChange={(v) => { if (!v) resetBookingForm(); setCreateOpen(v); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Appointment</DialogTitle>
            {bookPath !== 'quick' && (
              <div className="flex items-center gap-2 mt-2">
                {[1, 2, 3].map(s => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      bookStep > s ? 'bg-green-500 text-white' : bookStep === s ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {bookStep > s ? <CheckCircle2 className="h-3.5 w-3.5" /> : s}
                    </div>
                    <span className={`text-xs hidden sm:inline ${bookStep === s ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                      {s === 1 ? 'Patient' : s === 2 ? (isPetClinic ? 'Pet' : 'Details') : 'Slot & Book'}
                    </span>
                    {s < 3 && <div className="w-6 h-px bg-slate-200" />}
                  </div>
                ))}
              </div>
            )}
          </DialogHeader>

          {/* ── Step 1: Phone Lookup ── */}
          {bookStep === 1 && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-sm font-medium">Phone Number</Label>
                <p className="text-xs text-slate-400 mb-2">Enter patient's phone number to look up their records</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="e.g. 9876543210"
                      value={phoneLookup}
                      onChange={e => setPhoneLookup(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handlePhoneLookup()}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handlePhoneLookup} disabled={lookingUp || phoneLookup.length < 3}>
                    {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Patient / Pet Selection ── */}
          {bookStep === 2 && (
            <div className="space-y-4 py-2">
              {/* Patient found — show info */}
              {foundPatient && !creatingPatient && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Patient Found</span>
                  </div>
                  <p className="text-sm text-green-700">{foundPatient.full_name}</p>
                  <p className="text-xs text-green-600">{foundPatient.phone} {foundPatient.email ? `· ${foundPatient.email}` : ''}</p>
                </div>
              )}

              {/* ── NOT FOUND: Two-path choice ── */}
              {creatingPatient && bookPath === null && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-amber-800">No patient found for {phoneLookup}</p>
                    <p className="text-xs text-amber-600 mt-0.5">Choose how to proceed</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Register & Book */}
                    <button
                      onClick={() => setBookPath('register')}
                      className="text-left p-4 rounded-xl border-2 border-slate-200 hover:border-primary hover:bg-primary/5 transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <ClipboardList className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-primary">Register & Book</p>
                      <p className="text-xs text-slate-500 mt-1">Complete registration with all details, then book appointment</p>
                    </button>
                    {/* Quick Book */}
                    <button
                      onClick={() => setBookPath('quick')}
                      className="text-left p-4 rounded-xl border-2 border-slate-200 hover:border-orange-400 hover:bg-orange-50 transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                          <Zap className="h-4 w-4 text-orange-600" />
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-orange-600">Quick Book</p>
                      <p className="text-xs text-slate-500 mt-1">Book now with minimal info, register at clinic visit</p>
                    </button>
                  </div>
                </div>
              )}

              {/* ── REGISTER & BOOK: Full patient registration form ── */}
              {creatingPatient && bookPath === 'register' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <UserPlus className="h-4 w-4 text-primary" />
                    Register New Patient
                  </div>
                  <div>
                    <Label>Full Name *</Label>
                    <Input value={newPatientForm.full_name} onChange={e => setNewPatientForm(f => ({ ...f, full_name: e.target.value }))} className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Phone *</Label>
                      <Input value={newPatientForm.phone} onChange={e => setNewPatientForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input value={newPatientForm.email} onChange={e => setNewPatientForm(f => ({ ...f, email: e.target.value }))} className="mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Gender</Label>
                      <Select value={newPatientForm.gender} onValueChange={v => setNewPatientForm(f => ({ ...f, gender: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Date of Birth</Label>
                      <Input type="date" value={newPatientForm.date_of_birth} onChange={e => setNewPatientForm(f => ({ ...f, date_of_birth: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label>Blood Group</Label>
                      <Select value={newPatientForm.blood_group} onValueChange={v => setNewPatientForm(f => ({ ...f, blood_group: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(bg => (
                            <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input value={newPatientForm.address} onChange={e => setNewPatientForm(f => ({ ...f, address: e.target.value }))} className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Allergies</Label>
                      <Input value={newPatientForm.allergies} onChange={e => setNewPatientForm(f => ({ ...f, allergies: e.target.value }))} className="mt-1" placeholder="e.g. Penicillin" />
                    </div>
                    <div>
                      <Label>Chronic Conditions</Label>
                      <Input value={newPatientForm.chronic_conditions} onChange={e => setNewPatientForm(f => ({ ...f, chronic_conditions: e.target.value }))} className="mt-1" placeholder="e.g. Diabetes" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Emergency Contact Name</Label>
                      <Input value={newPatientForm.emergency_contact_name} onChange={e => setNewPatientForm(f => ({ ...f, emergency_contact_name: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label>Emergency Contact Phone</Label>
                      <Input value={newPatientForm.emergency_contact_phone} onChange={e => setNewPatientForm(f => ({ ...f, emergency_contact_phone: e.target.value }))} className="mt-1" />
                    </div>
                  </div>

                  {/* Pet form inline for pet clinic — Register Now is single page */}
                  {isPetClinic && !foundPatient && (
                    <>
                      <div className="border-t border-slate-100 pt-3 mt-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                          <PawPrint className="h-4 w-4 text-primary" /> Pet Details
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Pet Name *</Label>
                          <Input value={newPetForm.name} onChange={e => setNewPetForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                          <Label>Species *</Label>
                          <Select value={newPetForm.species} onValueChange={v => setNewPetForm(f => ({ ...f, species: v }))}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="dog">Dog</SelectItem>
                              <SelectItem value="cat">Cat</SelectItem>
                              <SelectItem value="bird">Bird</SelectItem>
                              <SelectItem value="rabbit">Rabbit</SelectItem>
                              <SelectItem value="hamster">Hamster</SelectItem>
                              <SelectItem value="fish">Fish</SelectItem>
                              <SelectItem value="reptile">Reptile</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label>Breed</Label>
                          <Input value={newPetForm.breed} onChange={e => setNewPetForm(f => ({ ...f, breed: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                          <Label>Gender</Label>
                          <Select value={newPetForm.gender} onValueChange={v => setNewPetForm(f => ({ ...f, gender: v }))}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>DOB</Label>
                          <Input type="date" value={newPetForm.date_of_birth} onChange={e => setNewPetForm(f => ({ ...f, date_of_birth: e.target.value }))} className="mt-1" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label>Weight (kg)</Label>
                          <Input type="number" value={newPetForm.weight} onChange={e => setNewPetForm(f => ({ ...f, weight: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                          <Label>Color</Label>
                          <Input value={newPetForm.color} onChange={e => setNewPetForm(f => ({ ...f, color: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                          <Label>Microchip ID</Label>
                          <Input value={newPetForm.microchip_id} onChange={e => setNewPetForm(f => ({ ...f, microchip_id: e.target.value }))} className="mt-1" />
                        </div>
                      </div>
                    </>
                  )}

                  <Button onClick={async () => {
                    // Register Now: Create patient + pet together, then go to step 3
                    setSaving(true);
                    try {
                      const payload = { ...newPatientForm, registration_status: 'registered' };
                      Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });
                      if (!payload.full_name) { toast.error('Full name is required'); setSaving(false); return; }
                      if (!payload.phone) { toast.error('Phone is required'); setSaving(false); return; }
                      const patRes = await api.post('/patients', payload);
                      setFoundPatient(patRes.data);
                      setCreatingPatient(false);
                      toast.success('Patient registered');

                      if (isPetClinic && newPetForm.name && newPetForm.species) {
                        const petData = { owner_id: patRes.data.id, name: newPetForm.name, species: newPetForm.species };
                        if (newPetForm.breed) petData.breed = newPetForm.breed;
                        if (newPetForm.gender) petData.gender = newPetForm.gender;
                        if (newPetForm.date_of_birth) petData.date_of_birth = newPetForm.date_of_birth;
                        if (newPetForm.weight) petData.weight = parseFloat(newPetForm.weight);
                        if (newPetForm.color) petData.color = newPetForm.color;
                        if (newPetForm.microchip_id) petData.microchip_id = newPetForm.microchip_id;
                        const petRes = await api.post('/pets', petData);
                        setSelectedPet(petRes.data);
                        setFoundPets([petRes.data]);
                        toast.success('Pet added');
                      }
                      setBookStep(3);
                    } catch (e) {
                      toast.error('Failed to register');
                    }
                    setSaving(false);
                  }} disabled={saving || !newPatientForm.full_name || !newPatientForm.phone || (isPetClinic && (!newPetForm.name || !newPetForm.species))} className="w-full">
                    {saving ? 'Registering...' : 'Register & Continue to Booking'}
                  </Button>
                </div>
              )}

              {/* ── QUICK BOOK: Minimal form + doctor + slot in one view ── */}
              {creatingPatient && bookPath === 'quick' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-orange-700">
                    <Zap className="h-4 w-4" />
                    Quick Book — Registration Pending
                  </div>
                  <p className="text-xs text-slate-500">Minimal info only. Staff will complete registration at clinic visit.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Owner Name *</Label>
                      <Input value={quickForm.owner_name} onChange={e => setQuickForm(f => ({ ...f, owner_name: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label>Phone *</Label>
                      <Input value={quickForm.owner_phone} onChange={e => setQuickForm(f => ({ ...f, owner_phone: e.target.value }))} className="mt-1" />
                    </div>
                  </div>
                  {isPetClinic && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Pet Name *</Label>
                        <Input value={quickForm.pet_name} onChange={e => setQuickForm(f => ({ ...f, pet_name: e.target.value }))} className="mt-1" />
                      </div>
                      <div>
                        <Label>Pet Type *</Label>
                        <Select value={quickForm.pet_type} onValueChange={v => setQuickForm(f => ({ ...f, pet_type: v }))}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dog">Dog</SelectItem>
                            <SelectItem value="cat">Cat</SelectItem>
                            <SelectItem value="bird">Bird</SelectItem>
                            <SelectItem value="rabbit">Rabbit</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  <div>
                    <Label>Reason for Visit</Label>
                    <Input value={quickForm.reason} onChange={e => setQuickForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. Vaccination, Check-up" className="mt-1" />
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <Label>Doctor *</Label>
                    <Select value={quickForm.doctor_id} onValueChange={v => { setQuickForm(f => ({ ...f, doctor_id: v, service_id: '' })); setQuickSelectedSlot(null); }}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select doctor" /></SelectTrigger>
                      <SelectContent>
                        {doctors.filter(d => d.is_active).map(d => (
                          <SelectItem key={d.id} value={d.id}>
                            <div className="flex items-center gap-2">
                              {d.color && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />}
                              {d.full_name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {quickForm.doctor_id && quickDoctorSvcs.length > 0 && (
                    <div>
                      <Label>Service</Label>
                      <Select value={quickForm.service_id} onValueChange={v => { setQuickForm(f => ({ ...f, service_id: v })); setQuickSelectedSlot(null); }}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select service" /></SelectTrigger>
                        <SelectContent>
                          {quickDoctorSvcs.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min)</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {quickForm.doctor_id && (
                    <div>
                      <Label>Date *</Label>
                      <Input type="date" value={quickForm.date} min={format(new Date(), 'yyyy-MM-dd')}
                        onChange={e => { setQuickForm(f => ({ ...f, date: e.target.value })); setQuickSelectedSlot(null); }} className="mt-1" />
                    </div>
                  )}
                  {quickForm.doctor_id && quickForm.date && (
                    <div>
                      <Label className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-primary" /> Available Slots
                      </Label>
                      {loadingQuickSlots ? (
                        <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
                      ) : quickSlots.filter(s => s.available).length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-3">No available slots</p>
                      ) : (
                        <div className="grid grid-cols-4 gap-2 mt-2 max-h-36 overflow-y-auto">
                          {quickSlots.filter(s => s.available).map((slot, i) => (
                            <button key={i} onClick={() => setQuickSelectedSlot(slot)}
                              className={`py-2 px-1 rounded-md text-sm font-medium text-center border transition-colors ${
                                quickSelectedSlot?.start_time === slot.start_time
                                  ? 'bg-primary text-white border-primary'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-primary hover:bg-primary/5'
                              }`}
                            >{slot.start_time}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <Button
                    onClick={handleQuickBook}
                    disabled={saving || !quickForm.owner_name || !quickForm.owner_phone || !quickForm.doctor_id || !quickSelectedSlot || !quickForm.date || (isPetClinic && (!quickForm.pet_name || !quickForm.pet_type))}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    {saving ? 'Booking...' : 'Quick Book'}
                  </Button>
                </div>
              )}

              {/* Pet selection — existing flow when patient IS found (pet clinic) */}
              {isPetClinic && foundPatient && !creatingPatient && !creatingPet && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select Pet</Label>
                  {foundPets.length > 0 ? (
                    <div className="space-y-2">
                      {foundPets.map(pet => (
                        <button
                          key={pet.id}
                          onClick={() => { setSelectedPet(pet); setBookStep(3); }}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            selectedPet?.id === pet.id ? 'border-primary bg-primary/5' : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <PawPrint className="h-5 w-5 text-primary shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-slate-900">{pet.name}</p>
                              <p className="text-xs text-slate-500 capitalize">{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No pets registered for this owner.</p>
                  )}
                  <Button variant="outline" onClick={() => { setCreatingPet(true); setNewPetForm({ name: '', species: '', breed: '', gender: '', date_of_birth: '', weight: '', color: '', microchip_id: '', notes: '' }); }} className="w-full gap-1.5">
                    <Plus className="h-4 w-4" /> Add New Pet
                  </Button>
                </div>
              )}

              {/* Create new pet — when patient found but adding new pet */}
              {isPetClinic && creatingPet && foundPatient && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <PawPrint className="h-4 w-4 text-primary" />
                    Add new pet for {foundPatient.full_name}
                  </div>
                  <div>
                    <Label>Pet Name *</Label>
                    <Input value={newPetForm.name} onChange={e => setNewPetForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Species *</Label>
                      <Select value={newPetForm.species} onValueChange={v => setNewPetForm(f => ({ ...f, species: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dog">Dog</SelectItem>
                          <SelectItem value="cat">Cat</SelectItem>
                          <SelectItem value="bird">Bird</SelectItem>
                          <SelectItem value="rabbit">Rabbit</SelectItem>
                          <SelectItem value="hamster">Hamster</SelectItem>
                          <SelectItem value="fish">Fish</SelectItem>
                          <SelectItem value="reptile">Reptile</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Breed</Label>
                      <Input value={newPetForm.breed} onChange={e => setNewPetForm(f => ({ ...f, breed: e.target.value }))} className="mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Gender</Label>
                      <Select value={newPetForm.gender} onValueChange={v => setNewPetForm(f => ({ ...f, gender: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>DOB</Label>
                      <Input type="date" value={newPetForm.date_of_birth} onChange={e => setNewPetForm(f => ({ ...f, date_of_birth: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label>Weight (kg)</Label>
                      <Input type="number" value={newPetForm.weight} onChange={e => setNewPetForm(f => ({ ...f, weight: e.target.value }))} className="mt-1" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCreatingPet(false)} className="flex-1">Cancel</Button>
                    <Button onClick={handleCreatePet} disabled={saving || !newPetForm.name || !newPetForm.species} className="flex-1">
                      {saving ? 'Adding...' : 'Add Pet'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Non-pet clinic: if patient found, proceed */}
              {!isPetClinic && foundPatient && !creatingPatient && (
                <Button onClick={() => setBookStep(3)} className="w-full">Continue to Select Doctor & Slot</Button>
              )}
            </div>
          )}

          {/* ── Step 3: Doctor + Service + Date + Slot ── */}
          {bookStep === 3 && (
            <div className="space-y-4 py-2">
              {/* Patient summary */}
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <span className="text-slate-500">Patient:</span>{' '}
                <span className="font-medium text-slate-900">{foundPatient?.full_name}</span>
                {selectedPet && (
                  <span className="text-slate-500"> · Pet: <span className="font-medium text-slate-900">{selectedPet.name}</span></span>
                )}
              </div>

              <div>
                <Label>Doctor *</Label>
                <Select value={selectedDoctor} onValueChange={v => { setSelectedDoctor(v); setSelectedService(''); setSelectedSlot(null); }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>
                    {doctors.filter(d => d.is_active).map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        <div className="flex items-center gap-2">
                          {d.color && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />}
                          {d.full_name}
                          {d.specialization && <span className="text-slate-400 text-xs">· {d.specialization}</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedDoctor && (
                <div>
                  <Label>Service</Label>
                  <Select value={selectedService} onValueChange={v => { setSelectedService(v); setSelectedSlot(null); }}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select service" /></SelectTrigger>
                    <SelectContent>
                      {doctorServices.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min{s.price > 0 ? ` · ₹${s.price}` : ''})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedDoctor && (
                <div>
                  <Label>Date *</Label>
                  <Input type="date" value={selectedDate} min={format(new Date(), 'yyyy-MM-dd')}
                    onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(null); }} className="mt-1" />
                </div>
              )}

              {/* Available slots */}
              {selectedDoctor && selectedDate && (
                <div>
                  <Label className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" /> Available Slots
                  </Label>
                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No slots found for this date</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 mt-2 max-h-48 overflow-y-auto">
                      {availableSlots.filter(s => s.available).map((slot, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 px-1 rounded-md text-sm font-medium text-center border transition-colors ${
                            selectedSlot?.start_time === slot.start_time
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-primary hover:bg-primary/5'
                          }`}
                        >
                          {slot.start_time}
                        </button>
                      ))}
                      {availableSlots.filter(s => s.available).length === 0 && (
                        <p className="col-span-4 text-sm text-slate-400 text-center py-2">All slots booked for this date</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Payment & Notes */}
              {selectedSlot && (
                <>
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-sm font-medium text-slate-700 mb-3">Payment Details</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Amount</Label>
                        <Input type="number" placeholder="0.00" value={paymentAmount}
                          onChange={e => setPaymentAmount(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label>Method</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Method" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="upi">UPI</SelectItem>
                            <SelectItem value="insurance">Insurance</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="partial">Partial</SelectItem>
                            <SelectItem value="waived">Waived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Input value={bookNotes} onChange={e => setBookNotes(e.target.value)} placeholder="Optional notes" className="mt-1" />
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <div>
              {bookStep > 1 && bookPath !== 'quick' && (
                <Button variant="ghost" size="sm" onClick={() => {
                  if (bookStep === 2 && bookPath) {
                    setBookPath(null); // go back to choice
                  } else {
                    setBookStep(s => s - 1);
                    if (bookStep === 2) setBookPath(null);
                  }
                }}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              )}
              {bookPath === 'quick' && (
                <Button variant="ghost" size="sm" onClick={() => setBookPath(null)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { resetBookingForm(); setCreateOpen(false); }}>Cancel</Button>
              {bookStep === 3 && selectedSlot && (
                <Button onClick={handleBook} disabled={saving}>
                  {saving ? 'Booking...' : 'Book Appointment'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════ Edit Appointment Dialog ═══════ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Appointment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Doctor</Label>
              <Select value={editForm.doctor_id} onValueChange={v => setEditForm(f => ({ ...f, doctor_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {doctors.filter(d => d.is_active).map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <Label>Start</Label>
                <Input type="time" value={editForm.start_time} onChange={e => setEditForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div>
                <Label>End</Label>
                <Input type="time" value={editForm.end_time} onChange={e => setEditForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>

            {/* Payment */}
            <div className="border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-700 mb-3">Payment Details</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Amount</Label>
                  <Input type="number" placeholder="0.00" value={editForm.payment_amount}
                    onChange={e => setEditForm(f => ({ ...f, payment_amount: e.target.value }))} />
                </div>
                <div>
                  <Label>Method</Label>
                  <Select value={editForm.payment_method || ''} onValueChange={v => setEditForm(f => ({ ...f, payment_method: v }))}>
                    <SelectTrigger><SelectValue placeholder="Method" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Pay Status</Label>
                  <Select value={editForm.payment_status || 'pending'} onValueChange={v => setEditForm(f => ({ ...f, payment_status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="waived">Waived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Input value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════ Vitals Recording Dialog ═══════ */}
      <Dialog open={vitalsOpen} onOpenChange={setVitalsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {vitalsAppt?.vitals ? 'Edit Vitals' : 'Record Vitals'}
            </DialogTitle>
            {vitalsAppt && (
              <p className="text-sm text-slate-500 mt-1">
                {vitalsAppt.patient?.full_name}{vitalsAppt.pet ? ` · ${vitalsAppt.pet.name}` : ''}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Weight (kg)</Label>
                <Input type="number" step="0.1" placeholder="e.g. 5.5" value={vitalsForm.weight}
                  onChange={e => setVitalsForm(f => ({ ...f, weight: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Temperature (°F)</Label>
                <Input type="number" step="0.1" placeholder="e.g. 101.5" value={vitalsForm.temperature}
                  onChange={e => setVitalsForm(f => ({ ...f, temperature: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Heart Rate (bpm)</Label>
                <Input type="number" placeholder="e.g. 80" value={vitalsForm.heart_rate}
                  onChange={e => setVitalsForm(f => ({ ...f, heart_rate: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Respiratory Rate</Label>
                <Input type="number" placeholder="e.g. 20" value={vitalsForm.respiratory_rate}
                  onChange={e => setVitalsForm(f => ({ ...f, respiratory_rate: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Blood Pressure</Label>
              <Input placeholder="e.g. 120/80" value={vitalsForm.blood_pressure}
                onChange={e => setVitalsForm(f => ({ ...f, blood_pressure: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Notes</Label>
              <Input placeholder="Any observations..." value={vitalsForm.notes}
                onChange={e => setVitalsForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVitalsOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveVitals} disabled={savingVitals}>
              {savingVitals ? 'Saving...' : 'Save Vitals'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

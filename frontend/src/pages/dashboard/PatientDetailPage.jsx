import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft, User, Calendar, FileText, Pill, ClipboardList, PawPrint,
  Phone, Mail, MapPin, AlertCircle, Heart, UserCheck
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function PatientDetailPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [reports, setReports] = useState([]);
  const [pets, setPets] = useState([]);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRegForm, setShowRegForm] = useState(false);
  const [regForm, setRegForm] = useState({});
  const [savingReg, setSavingReg] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [patRes, apptRes, tenantRes] = await Promise.all([
        api.get(`/patients/${patientId}`),
        api.get(`/patients/${patientId}/appointments`),
        api.get('/tenant/me'),
      ]);
      setPatient(patRes.data);
      setAppointments(apptRes.data);
      setTenant(tenantRes.data);

      const [mrRes, rxRes, repRes, petRes] = await Promise.all([
        api.get(`/patients/${patientId}/medical-records`),
        api.get(`/patients/${patientId}/prescriptions`),
        api.get(`/patients/${patientId}/reports`),
        api.get(`/patients/${patientId}/pets`),
      ]);
      setMedicalRecords(mrRes.data);
      setPrescriptions(rxRes.data);
      setReports(repRes.data);
      setPets(petRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [patientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Patient not found</p>
        <Button variant="outline" onClick={() => navigate('/dashboard/patients')} className="mt-4">Back to Patients</Button>
      </div>
    );
  }

  const isPetClinic = tenant?.type === 'pet_clinic';
  const statusColor = {
    scheduled: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    no_show: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/patients')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-lg font-bold text-primary">
              {patient.full_name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{patient.full_name}</h1>
              <div className="flex items-center gap-4 text-sm text-slate-500 mt-0.5">
                {patient.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {patient.email}</span>}
                {patient.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {patient.phone}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Registration Banner */}
      {patient.registration_status === 'pending' && (
        <Card className="rounded-xl border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            {!showRegForm ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Registration Pending</p>
                    <p className="text-xs text-amber-600">This patient was quick-booked. Complete their registration with full details.</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => {
                  setRegForm({
                    full_name: patient.full_name || '',
                    email: patient.email || '',
                    phone: patient.phone || '',
                    date_of_birth: patient.date_of_birth || '',
                    gender: patient.gender || '',
                    address: patient.address || '',
                    blood_group: patient.blood_group || '',
                    allergies: patient.allergies || '',
                    chronic_conditions: patient.chronic_conditions || '',
                    emergency_contact_name: patient.emergency_contact_name || '',
                    emergency_contact_phone: patient.emergency_contact_phone || '',
                  });
                  setShowRegForm(true);
                }} className="gap-1.5 bg-amber-600 hover:bg-amber-700">
                  <UserCheck className="h-4 w-4" /> Complete Registration
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-amber-800">Complete Registration</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Full Name *</Label>
                    <Input value={regForm.full_name} onChange={e => setRegForm(f => ({ ...f, full_name: e.target.value }))} className="mt-1 bg-white" />
                  </div>
                  <div>
                    <Label className="text-xs">Phone *</Label>
                    <Input value={regForm.phone} onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))} className="mt-1 bg-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} className="mt-1 bg-white" />
                  </div>
                  <div>
                    <Label className="text-xs">Gender</Label>
                    <Select value={regForm.gender} onValueChange={v => setRegForm(f => ({ ...f, gender: v }))}>
                      <SelectTrigger className="mt-1 bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Date of Birth</Label>
                    <Input type="date" value={regForm.date_of_birth} onChange={e => setRegForm(f => ({ ...f, date_of_birth: e.target.value }))} className="mt-1 bg-white" />
                  </div>
                  <div>
                    <Label className="text-xs">Blood Group</Label>
                    <Select value={regForm.blood_group} onValueChange={v => setRegForm(f => ({ ...f, blood_group: v }))}>
                      <SelectTrigger className="mt-1 bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(bg => (
                          <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Address</Label>
                    <Input value={regForm.address} onChange={e => setRegForm(f => ({ ...f, address: e.target.value }))} className="mt-1 bg-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Allergies</Label>
                    <Input value={regForm.allergies} onChange={e => setRegForm(f => ({ ...f, allergies: e.target.value }))} className="mt-1 bg-white" placeholder="e.g. Penicillin" />
                  </div>
                  <div>
                    <Label className="text-xs">Chronic Conditions</Label>
                    <Input value={regForm.chronic_conditions} onChange={e => setRegForm(f => ({ ...f, chronic_conditions: e.target.value }))} className="mt-1 bg-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Emergency Contact Name</Label>
                    <Input value={regForm.emergency_contact_name} onChange={e => setRegForm(f => ({ ...f, emergency_contact_name: e.target.value }))} className="mt-1 bg-white" />
                  </div>
                  <div>
                    <Label className="text-xs">Emergency Contact Phone</Label>
                    <Input value={regForm.emergency_contact_phone} onChange={e => setRegForm(f => ({ ...f, emergency_contact_phone: e.target.value }))} className="mt-1 bg-white" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setShowRegForm(false)}>Cancel</Button>
                  <Button size="sm" onClick={async () => {
                    setSavingReg(true);
                    try {
                      const payload = { ...regForm, registration_status: 'registered' };
                      Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });
                      await api.put(`/patients/${patientId}`, payload);
                      toast.success('Registration completed');
                      setShowRegForm(false);
                      fetchData();
                    } catch (e) {
                      toast.error('Failed to update registration');
                    }
                    setSavingReg(false);
                  }} disabled={savingReg || !regForm.full_name} className="bg-amber-600 hover:bg-amber-700">
                    {savingReg ? 'Saving...' : 'Save & Complete Registration'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5"><User className="h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="appointments" className="gap-1.5"><Calendar className="h-4 w-4" /> Appointments</TabsTrigger>
          <TabsTrigger value="medical" className="gap-1.5"><ClipboardList className="h-4 w-4" /> Medical History</TabsTrigger>
          <TabsTrigger value="prescriptions" className="gap-1.5"><Pill className="h-4 w-4" /> Prescriptions</TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5"><FileText className="h-4 w-4" /> Reports</TabsTrigger>
          {isPetClinic && <TabsTrigger value="pets" className="gap-1.5"><PawPrint className="h-4 w-4" /> Pets</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Summary Cards */}
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
                    <p className="text-2xl font-bold text-amber-700">{reports.length}</p>
                    <p className="text-xs text-slate-500 mt-1">Reports</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Patient Info */}
            <Card className="rounded-xl border-slate-200/60">
              <CardHeader><CardTitle className="text-base">{isPetClinic ? 'Owner Details' : 'Patient Details'}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {patient.gender && <div className="flex justify-between text-sm"><span className="text-slate-500">Gender</span><span className="text-slate-900">{patient.gender}</span></div>}
                {patient.date_of_birth && <div className="flex justify-between text-sm"><span className="text-slate-500">Date of Birth</span><span className="text-slate-900">{patient.date_of_birth}</span></div>}
                {patient.blood_group && <div className="flex justify-between text-sm"><span className="text-slate-500">Blood Group</span><span className="text-slate-900">{patient.blood_group}</span></div>}
                {patient.address && <div className="flex justify-between text-sm"><span className="text-slate-500">Address</span><span className="text-slate-900">{patient.address}</span></div>}
                {patient.allergies && (
                  <div className="text-sm">
                    <span className="text-slate-500 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5 text-red-500" /> Allergies</span>
                    <p className="text-slate-900 mt-1">{patient.allergies}</p>
                  </div>
                )}
                {patient.chronic_conditions && (
                  <div className="text-sm">
                    <span className="text-slate-500 flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-red-500" /> Chronic Conditions</span>
                    <p className="text-slate-900 mt-1">{patient.chronic_conditions}</p>
                  </div>
                )}
                {patient.emergency_contact_name && (
                  <div className="text-sm">
                    <span className="text-slate-500">Emergency Contact</span>
                    <p className="text-slate-900 mt-1">{patient.emergency_contact_name} {patient.emergency_contact_phone && `- ${patient.emergency_contact_phone}`}</p>
                  </div>
                )}
                {patient.notes && <div className="text-sm"><span className="text-slate-500">Notes</span><p className="text-slate-900 mt-1">{patient.notes}</p></div>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments">
          <Card className="rounded-xl border-slate-200/60">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead className="hidden md:table-cell">Service</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-slate-400">No appointments found</TableCell></TableRow>
                  ) : appointments.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm">{format(parseISO(a.start_time), 'MMM d, yyyy h:mm a')}</TableCell>
                      <TableCell className="text-sm">{a.doctor?.full_name || '-'}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{a.service?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge className={`rounded-full text-xs ${statusColor[a.status] || 'bg-slate-100'}`}>
                          {a.status?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medical History Tab */}
        <TabsContent value="medical">
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
                    <span className="text-xs text-slate-400 shrink-0">
                      {r.record_date ? format(parseISO(r.record_date), 'MMM d, yyyy') : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Prescriptions Tab */}
        <TabsContent value="prescriptions">
          <div className="space-y-3">
            {prescriptions.length === 0 ? (
              <Card className="rounded-xl border-slate-200/60"><CardContent className="py-12 text-center text-slate-400">No prescriptions found</CardContent></Card>
            ) : prescriptions.map(rx => (
              <Card key={rx.id} className="rounded-xl border-slate-200/60">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={`rounded-full text-xs ${rx.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {rx.is_active ? 'Active' : 'Completed'}
                        </Badge>
                      </div>
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
                    <span className="text-xs text-slate-400 shrink-0">
                      {rx.prescribed_date ? format(parseISO(rx.prescribed_date), 'MMM d, yyyy') : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
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
                  <p className="text-xs text-slate-400 mt-2">
                    {rep.report_date ? format(parseISO(rep.report_date), 'MMM d, yyyy') : ''}
                  </p>
                  {rep.file_url && (
                    <a href={rep.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-2 inline-block">
                      View Document
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Pets Tab (Vet Clinics only) */}
        {isPetClinic && (
          <TabsContent value="pets">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pets.length === 0 ? (
                <Card className="rounded-xl border-slate-200/60 col-span-full"><CardContent className="py-12 text-center text-slate-400">No pets registered</CardContent></Card>
              ) : pets.map(pet => (
                <Card key={pet.id} className="rounded-xl border-slate-200/60">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <PawPrint className="h-5 w-5 text-amber-600" />
                      <h4 className="text-sm font-bold text-slate-900">{pet.name}</h4>
                    </div>
                    <div className="space-y-1 text-sm text-slate-600">
                      {pet.species && <p><span className="text-slate-400">Species:</span> {pet.species}</p>}
                      {pet.breed && <p><span className="text-slate-400">Breed:</span> {pet.breed}</p>}
                      {pet.gender && <p><span className="text-slate-400">Gender:</span> {pet.gender}</p>}
                      {pet.weight && <p><span className="text-slate-400">Weight:</span> {pet.weight} kg</p>}
                      {pet.date_of_birth && <p><span className="text-slate-400">DOB:</span> {pet.date_of_birth}</p>}
                      {pet.vaccination_status && <p><span className="text-slate-400">Vaccination:</span> {pet.vaccination_status}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

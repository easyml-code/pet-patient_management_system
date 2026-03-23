import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, User, Mail, Phone, PawPrint, Edit, Trash2 } from 'lucide-react';
import { differenceInYears, differenceInMonths, parseISO } from 'date-fns';

function petAge(dob) {
  if (!dob) return null;
  const d = typeof dob === 'string' ? parseISO(dob) : dob;
  const years = differenceInYears(new Date(), d);
  if (years >= 1) return `${years} yr${years > 1 ? 's' : ''}`;
  const months = differenceInMonths(new Date(), d);
  return `${months} mo${months !== 1 ? 's' : ''}`;
}

export default function PatientsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [patients, setPatients] = useState([]);
  const [pets, setPets] = useState([]);
  const [isPetClinic, setIsPetClinic] = useState(false);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', gender: '', notes: '' });
  const [petForm, setPetForm] = useState({ name: '', species: '', breed: '', gender: '', date_of_birth: '', owner_id: '' });
  const [addMode, setAddMode] = useState('patient'); // 'patient' or 'pet'
  const [loading, setLoading] = useState(true);
  const [regFilter, setRegFilter] = useState('all'); // 'all', 'registered', 'pending'

  const fetchData = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (regFilter !== 'all') params.registration_status = regFilter;
      const [patientsRes, tenantRes] = await Promise.all([
        api.get('/patients', { params }),
        api.get('/tenant/me'),
      ]);
      setPatients(patientsRes.data);
      const isPet = tenantRes.data?.type === 'pet_clinic';
      setIsPetClinic(isPet);
      if (isPet) {
        const petsRes = await api.get('/pets');
        setPets(petsRes.data);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [search, regFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter pets by search
  const filteredPets = pets.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(s) ||
      p.species?.toLowerCase().includes(s) ||
      p.breed?.toLowerCase().includes(s) ||
      p.owner?.full_name?.toLowerCase().includes(s) ||
      p.owner?.phone?.toLowerCase().includes(s) ||
      p.owner?.email?.toLowerCase().includes(s)
    );
  });

  const openNewPatient = () => {
    setEditId(null);
    setAddMode('patient');
    setForm({ full_name: '', email: '', phone: '', gender: '', notes: '' });
    setDialogOpen(true);
  };

  const openNewPet = () => {
    setEditId(null);
    setAddMode('pet');
    setPetForm({ name: '', species: '', breed: '', gender: '', date_of_birth: '', owner_id: '' });
    setDialogOpen(true);
  };

  const openEditPatient = (p, e) => {
    e?.stopPropagation();
    setEditId(p.id);
    setAddMode('patient');
    setForm({ full_name: p.full_name, email: p.email || '', phone: p.phone || '', gender: p.gender || '', notes: p.notes || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (addMode === 'pet') {
        await api.post('/pets', petForm);
      } else if (editId) {
        await api.put(`/patients/${editId}`, form);
      } else {
        await api.post('/patients', form);
      }
      setDialogOpen(false);
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm('Delete this patient/owner?')) return;
    try {
      await api.delete(`/patients/${id}`);
      fetchData();
    } catch (e) { console.error(e); }
  };

  // ── Pet Clinic View ──
  if (isPetClinic) {
    return (
      <div data-testid="patients-page" className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patients</h1>
            <p className="text-sm text-slate-500 mt-1">Manage pets and their owners</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={openNewPatient} className="rounded-lg">
              <Plus className="h-4 w-4 mr-1.5" /> Add Owner
            </Button>
            <Button data-testid="add-patient-btn" onClick={openNewPet} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg">
              <Plus className="h-4 w-4 mr-1.5" /> Add Pet
            </Button>
          </div>
        </div>

        <Card className="rounded-xl border-slate-200/60">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  data-testid="patient-search-input"
                  placeholder="Search by pet name, breed, owner name, or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={regFilter} onValueChange={setRegFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Registration" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="registered">Registered</SelectItem>
                  <SelectItem value="pending">Pending Registration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pet</TableHead>
                  <TableHead className="hidden md:table-cell">Species / Breed</TableHead>
                  <TableHead className="hidden lg:table-cell">Age</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                      {loading ? 'Loading...' : 'No pets found. Add your first pet.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPets.map(p => (
                    <TableRow
                      key={p.id}
                      data-testid={`patient-row-${p.id}`}
                      className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                      onClick={() => navigate(`/dashboard/pets/${p.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {p.photo_url ? (
                            <img src={p.photo_url} alt={p.name} className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                              <PawPrint className="h-4 w-4 text-amber-600" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-slate-900">{p.name}</p>
                            <p className="text-xs text-slate-500 md:hidden">{p.species}{p.breed ? ` - ${p.breed}` : ''}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div>
                          <p className="text-sm text-slate-700 capitalize">{p.species || '-'}</p>
                          {p.breed && <p className="text-xs text-slate-400">{p.breed}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-slate-600">{petAge(p.date_of_birth) || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-sm text-slate-700">{p.owner?.full_name || '-'}</span>
                          {p.owner?.registration_status === 'pending' && (
                            <Badge className="rounded-full text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700">Pending</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-0.5">
                          {p.owner?.phone && <p className="text-xs text-slate-600 flex items-center gap-1"><Phone className="h-3 w-3" />{p.owner.phone}</p>}
                          {p.owner?.email && <p className="text-xs text-slate-600 flex items-center gap-1"><Mail className="h-3 w-3" />{p.owner.email}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/pets/${p.id}`); }}>
                            <Edit className="h-4 w-4 text-slate-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add Owner / Add Pet Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {addMode === 'pet' ? 'New Pet' : editId ? 'Edit Owner' : 'New Owner'}
              </DialogTitle>
            </DialogHeader>
            {addMode === 'pet' ? (
              <div className="space-y-4 py-2">
                <div>
                  <Label>Owner *</Label>
                  <Select value={petForm.owner_id} onValueChange={v => setPetForm({ ...petForm, owner_id: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select owner" /></SelectTrigger>
                    <SelectContent>
                      {patients.map(pt => (
                        <SelectItem key={pt.id} value={pt.id}>{pt.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Pet Name *</Label><Input value={petForm.name} onChange={e => setPetForm({ ...petForm, name: e.target.value })} className="mt-1.5" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Species</Label>
                    <Select value={petForm.species} onValueChange={v => setPetForm({ ...petForm, species: v })}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dog">Dog</SelectItem>
                        <SelectItem value="Cat">Cat</SelectItem>
                        <SelectItem value="Bird">Bird</SelectItem>
                        <SelectItem value="Rabbit">Rabbit</SelectItem>
                        <SelectItem value="Hamster">Hamster</SelectItem>
                        <SelectItem value="Fish">Fish</SelectItem>
                        <SelectItem value="Reptile">Reptile</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Breed</Label><Input value={petForm.breed} onChange={e => setPetForm({ ...petForm, breed: e.target.value })} className="mt-1.5" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Gender</Label>
                    <Select value={petForm.gender} onValueChange={v => setPetForm({ ...petForm, gender: v })}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Date of Birth</Label><Input type="date" value={petForm.date_of_birth} onChange={e => setPetForm({ ...petForm, date_of_birth: e.target.value })} className="mt-1.5" /></div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div><Label>Full Name *</Label><Input data-testid="patient-name-input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="mt-1.5" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email" className="mt-1.5" /></div>
                  <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1.5" /></div>
                </div>
                <div><Label>Gender</Label><Input value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} placeholder="Male / Female / Other" className="mt-1.5" /></div>
                <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." className="mt-1.5" /></div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                data-testid="patient-save-btn"
                onClick={handleSave}
                disabled={addMode === 'pet' ? (!petForm.name || !petForm.owner_id) : !form.full_name}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {addMode === 'pet' ? 'Add Pet' : editId ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Human Clinic View (original) ──
  return (
    <div data-testid="patients-page" className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patients</h1>
          <p className="text-sm text-slate-500 mt-1">Manage patient records and history</p>
        </div>
        <Button data-testid="add-patient-btn" onClick={openNewPatient} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg">
          <Plus className="h-4 w-4 mr-1.5" /> Add Patient
        </Button>
      </div>

      <Card className="rounded-xl border-slate-200/60">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                data-testid="patient-search-input"
                placeholder="Search patients by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={regFilter} onValueChange={setRegFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Registration" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="pending">Pending Registration</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="hidden lg:table-cell">Gender</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-slate-400">
                    {loading ? 'Loading...' : 'No patients found. Add your first patient.'}
                  </TableCell>
                </TableRow>
              ) : (
                patients.map(p => (
                  <TableRow
                    key={p.id}
                    data-testid={`patient-row-${p.id}`}
                    className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                    onClick={() => navigate(`/dashboard/patients/${p.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-slate-900">{p.full_name}</p>
                            {p.registration_status === 'pending' && (
                              <Badge className="rounded-full text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700">Pending</Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 md:hidden">{p.email || p.phone}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-0.5">
                        {p.email && <p className="text-xs text-slate-600 flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</p>}
                        {p.phone && <p className="text-xs text-slate-600 flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm text-slate-600 capitalize">{p.gender || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={(e) => openEditPatient(p, e)} data-testid={`edit-patient-${p.id}`}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={(e) => handleDelete(p.id, e)} data-testid={`delete-patient-${p.id}`} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Patient' : 'New Patient'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Full Name *</Label><Input data-testid="patient-name-input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="mt-1.5" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email" className="mt-1.5" /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1.5" /></div>
            </div>
            <div><Label>Gender</Label><Input value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} placeholder="Male / Female / Other" className="mt-1.5" /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Medical notes..." className="mt-1.5" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button data-testid="patient-save-btn" onClick={handleSave} disabled={!form.full_name} className="bg-primary hover:bg-primary/90 text-primary-foreground">{editId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

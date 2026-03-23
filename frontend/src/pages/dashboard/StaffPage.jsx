import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, Stethoscope, UserCog, UserPlus, Mail, Phone, Shield } from 'lucide-react';
import { toast } from 'sonner';

function StaffTab({ type, isAdmin }) {
  const navigate = useNavigate();
  const isDoctor = type === 'doctors';
  const endpoint = isDoctor ? '/doctors' : '/staff';
  const [items, setItems] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editUserId, setEditUserId] = useState(null);
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', ...(isDoctor ? { specialization: '', color: '#2563EB' } : { role: '' }) });

  const fetch = useCallback(async () => {
    try { setItems((await api.get(endpoint)).data); } catch (e) { console.error(e); }
  }, [endpoint]);

  useEffect(() => { fetch(); }, [fetch]);

  const openEdit = async (item, e) => {
    e?.stopPropagation();
    setEditId(item.id);
    setEditUserId(item.user_id || null);
    setForm({ full_name: item.full_name, email: item.email || '', phone: item.phone || '', ...(isDoctor ? { specialization: item.specialization || '', color: item.color || '#2563EB' } : { role: item.role || '' }) });
    // Fetch user record to get is_admin
    if (item.user_id) {
      try {
        const res = await api.get(`/members/${item.user_id}`);
        setEditIsAdmin(res.data.is_admin || false);
      } catch { setEditIsAdmin(false); }
    } else {
      setEditIsAdmin(false);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      await api.put(`${endpoint}/${editId}`, form);
      // Update admin status if user_id exists
      if (editUserId) {
        await api.put(`/members/${editUserId}/role`, { is_admin: editIsAdmin });
      }
      setDialogOpen(false); fetch();
      toast.success('Updated successfully');
    } catch (e) {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm(`Delete this ${isDoctor ? 'doctor' : 'staff member'}?`)) return;
    try { await api.delete(`${endpoint}/${id}`); fetch(); } catch (e) { console.error(e); }
  };

  const handleRowClick = (item) => {
    navigate(`/dashboard/staff/${isDoctor ? 'doctor' : 'member'}/${item.id}`);
  };

  return (
    <>
      <Card className="rounded-xl border-slate-200/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>{isDoctor ? 'Specialization' : 'Role'}</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                {isAdmin && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400">No {type} found</TableCell></TableRow>
              ) : items.map(item => (
                <TableRow
                  key={item.id}
                  data-testid={`${type}-row-${item.id}`}
                  className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                  onClick={() => handleRowClick(item)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {item.photo_url ? (
                        <img src={item.photo_url} alt={item.full_name} className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                          style={{ backgroundColor: item.color || (isDoctor ? '#2563EB' : '#6366F1') }}
                        >
                          {item.full_name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.full_name}</p>
                        {isDoctor && item.qualification && (
                          <p className="text-xs text-slate-400">{item.qualification}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{isDoctor ? (item.specialization || '-') : (item.role || '-')}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="space-y-0.5">
                      {item.email && <p className="text-xs text-slate-500 flex items-center gap-1"><Mail className="h-3 w-3" />{item.email}</p>}
                      {item.phone && <p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="h-3 w-3" />{item.phone}</p>}
                      {!item.email && !item.phone && <span className="text-xs text-slate-400">-</span>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge className={`rounded-full text-xs ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={(e) => openEdit(item, e)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={(e) => handleDelete(item.id, e)} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit {isDoctor ? 'Doctor' : 'Staff Member'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Full Name *</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="mt-1.5" /></div>
            {isDoctor ? (
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Specialization</Label><Input value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} className="mt-1.5" /></div>
                <div><Label>Color</Label><Input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="mt-1.5 h-10" /></div>
              </div>
            ) : (
              <div><Label>Role</Label><Input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="Receptionist, Nurse..." className="mt-1.5" /></div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email" className="mt-1.5" /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1.5" /></div>
            </div>
            {editUserId && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <Label className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Admin Access</Label>
                  <p className="text-xs text-slate-400 mt-0.5">Grant admin privileges</p>
                </div>
                <Switch checked={editIsAdmin} onCheckedChange={setEditIsAdmin} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.full_name} className="bg-primary hover:bg-primary/90 text-primary-foreground">Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function StaffPage() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const isAdmin = profile?.is_admin || profile?.role === 'admin';
  const defaultTab = searchParams.get('tab') || 'doctors';

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [grantAdmin, setGrantAdmin] = useState(false);
  const [memberForm, setMemberForm] = useState({
    full_name: '', email: '', role: 'doctor', temp_password: '',
    specialization: '', phone: '', color: '#2563EB',
  });
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const resetMemberForm = () => {
    setMemberForm({
      full_name: '', email: '', role: 'doctor', temp_password: '',
      specialization: '', phone: '', color: '#2563EB',
    });
    setGrantAdmin(false);
  };

  const handleAddMember = async () => {
    if (memberForm.temp_password.length < 6) {
      toast.error('Temporary password must be at least 6 characters');
      return;
    }
    setCreating(true);
    try {
      const res = await api.post('/members', memberForm);
      // If granting admin, update the user's is_admin flag
      if (grantAdmin && res.data.user_id) {
        await api.put(`/members/${res.data.user_id}/role`, { is_admin: true });
      }
      setAddMemberOpen(false);
      resetMemberForm();
      setRefreshKey(k => k + 1);
      toast.success('Member created successfully. They can now log in with the temporary password.');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create member');
    }
    setCreating(false);
  };

  return (
    <div data-testid="staff-page" className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage doctors and staff members</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { resetMemberForm(); setAddMemberOpen(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg">
            <UserPlus className="h-4 w-4 mr-1.5" /> Add Member
          </Button>
        )}
      </div>

      <Tabs defaultValue={defaultTab} key={refreshKey}>
        <TabsList>
          <TabsTrigger value="doctors" data-testid="tab-doctors" className="gap-1.5"><Stethoscope className="h-4 w-4" /> Doctors</TabsTrigger>
          <TabsTrigger value="staff" data-testid="tab-staff" className="gap-1.5"><UserCog className="h-4 w-4" /> Staff</TabsTrigger>
        </TabsList>
        <TabsContent value="doctors"><StaffTab type="doctors" isAdmin={isAdmin} /></TabsContent>
        <TabsContent value="staff"><StaffTab type="staff" isAdmin={isAdmin} /></TabsContent>
      </Tabs>

      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Primary Role *</Label>
              <Select value={memberForm.role} onValueChange={v => setMemberForm({ ...memberForm, role: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Full Name *</Label><Input value={memberForm.full_name} onChange={e => setMemberForm({ ...memberForm, full_name: e.target.value })} className="mt-1.5" /></div>
            <div><Label>Email *</Label><Input type="email" value={memberForm.email} onChange={e => setMemberForm({ ...memberForm, email: e.target.value })} className="mt-1.5" /></div>
            <div>
              <Label>Temporary Password *</Label>
              <Input type="text" value={memberForm.temp_password} onChange={e => setMemberForm({ ...memberForm, temp_password: e.target.value })} placeholder="Min 6 characters" className="mt-1.5" />
              <p className="text-xs text-slate-400 mt-1">Member will be asked to change this on first login</p>
            </div>
            {memberForm.role === 'doctor' && (
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Specialization</Label><Input value={memberForm.specialization} onChange={e => setMemberForm({ ...memberForm, specialization: e.target.value })} className="mt-1.5" /></div>
                <div><Label>Color</Label><Input type="color" value={memberForm.color} onChange={e => setMemberForm({ ...memberForm, color: e.target.value })} className="mt-1.5 h-10" /></div>
              </div>
            )}
            {memberForm.role === 'staff' && (
              <div><Label>Role/Title</Label><Input value={memberForm.specialization} onChange={e => setMemberForm({ ...memberForm, specialization: e.target.value })} placeholder="Receptionist, Nurse..." className="mt-1.5" /></div>
            )}
            <div><Label>Phone</Label><Input value={memberForm.phone} onChange={e => setMemberForm({ ...memberForm, phone: e.target.value })} className="mt-1.5" /></div>
            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <Label className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Also grant Admin access</Label>
                <p className="text-xs text-slate-400 mt-0.5">Settings, team management, analytics</p>
              </div>
              <Switch checked={grantAdmin} onCheckedChange={setGrantAdmin} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMember} disabled={!memberForm.full_name || !memberForm.email || !memberForm.temp_password || creating} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {creating ? 'Creating...' : 'Create Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

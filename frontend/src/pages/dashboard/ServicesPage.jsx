import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Clock, DollarSign } from 'lucide-react';

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', duration_minutes: 30, price: 0, color: '#2563EB' });

  const fetch = useCallback(async () => {
    try { setServices((await api.get('/services')).data); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openNew = () => { setEditId(null); setForm({ name: '', description: '', duration_minutes: 30, price: 0, color: '#2563EB' }); setDialogOpen(true); };
  const openEdit = (s) => { setEditId(s.id); setForm({ name: s.name, description: s.description || '', duration_minutes: s.duration_minutes, price: s.price, color: s.color }); setDialogOpen(true); };

  const handleSave = async () => {
    try {
      const payload = { ...form, duration_minutes: parseInt(form.duration_minutes), price: parseFloat(form.price) };
      if (editId) await api.put(`/services/${editId}`, payload);
      else await api.post('/services', payload);
      setDialogOpen(false); fetch();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this service?')) return;
    try { await api.delete(`/services/${id}`); fetch(); } catch (e) { console.error(e); }
  };

  return (
    <div data-testid="services-page" className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Services</h1>
          <p className="text-sm text-slate-500 mt-1">Configure clinic services and slot durations</p>
        </div>
        <Button data-testid="add-service-btn" onClick={openNew} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg">
          <Plus className="h-4 w-4 mr-1.5" /> Add Service
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {services.length === 0 ? (
          <Card className="col-span-full rounded-xl border-slate-200/60"><CardContent className="py-12 text-center text-slate-400">No services configured yet</CardContent></Card>
        ) : services.map(s => (
          <Card key={s.id} data-testid={`service-card-${s.id}`} className="rounded-xl border-slate-200/60 hover:shadow-md group">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-8 rounded-full" style={{ backgroundColor: s.color }} />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{s.name}</h3>
                    {s.description && <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>}
                  </div>
                </div>
                <Badge className={`rounded-full text-xs ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-4 text-sm text-slate-600">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{s.duration_minutes} min</span>
                <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />${s.price}</span>
              </div>
              <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Edit className="h-3.5 w-3.5 mr-1" />Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} className="text-red-500"><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Edit Service' : 'New Service'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Service Name *</Label><Input data-testid="service-name-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1.5" /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1.5" /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Duration (min)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Price ($)</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Color</Label><Input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="mt-1.5 h-10" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button data-testid="service-save-btn" onClick={handleSave} disabled={!form.name} className="bg-primary hover:bg-primary/90 text-primary-foreground">{editId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

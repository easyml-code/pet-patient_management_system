import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, ChevronLeft, ChevronRight, Clock, Check } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';

export default function CalendarPage() {
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ doctor_id: '', patient_id: '', service_id: '', notes: '' });
  const [duration, setDuration] = useState(30);
  const [bookingDate, setBookingDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [d, p, s] = await Promise.all([
        api.get('/doctors'),
        api.get('/patients'),
        api.get('/services'),
      ]);
      setDoctors(d.data);
      setPatients(p.data);
      setServices(s.data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      const params = {};
      if (selectedDoctor !== 'all') params.doctor_id = selectedDoctor;
      params.date_from = format(weekStart, "yyyy-MM-dd'T'00:00:00");
      params.date_to = format(addDays(weekStart, 6), "yyyy-MM-dd'T'23:59:59");
      const res = await api.get('/appointments', { params });
      setAppointments(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [selectedDoctor, weekStart]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // Fetch available slots when doctor, date, or duration changes
  useEffect(() => {
    if (!form.doctor_id || !bookingDate) { setAvailableSlots([]); return; }
    const fetchSlots = async () => {
      setSlotsLoading(true);
      try {
        const res = await api.get('/appointments/available-slots', {
          params: { doctor_id: form.doctor_id, date: format(bookingDate, 'yyyy-MM-dd'), duration }
        });
        setAvailableSlots(res.data);
      } catch (e) { console.error(e); setAvailableSlots([]); }
      setSlotsLoading(false);
    };
    fetchSlots();
  }, [form.doctor_id, bookingDate, duration]);

  const openBookingDialog = () => {
    setForm({ doctor_id: '', patient_id: '', service_id: '', notes: '' });
    setDuration(30);
    setBookingDate(null);
    setSelectedSlot(null);
    setAvailableSlots([]);
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!selectedSlot || !bookingDate) return;
    const [startH, startM] = selectedSlot.start_time.split(':').map(Number);
    const [endH, endM] = selectedSlot.end_time.split(':').map(Number);
    const startDt = new Date(bookingDate);
    startDt.setHours(startH, startM, 0, 0);
    const endDt = new Date(bookingDate);
    endDt.setHours(endH, endM, 0, 0);
    try {
      await api.post('/appointments', {
        doctor_id: form.doctor_id,
        patient_id: form.patient_id,
        service_id: form.service_id || null,
        start_time: startDt.toISOString(),
        end_time: endDt.toISOString(),
        notes: form.notes || null,
      });
      setDialogOpen(false);
      fetchAppointments();
    } catch (e) { console.error(e); }
  };

  const scrollRef = useRef(null);
  const ROW_HEIGHT = 60;

  // Auto-scroll to current hour on mount
  useEffect(() => {
    if (scrollRef.current) {
      const currentHour = new Date().getHours();
      scrollRef.current.scrollTop = Math.max(0, (currentHour - 2) * ROW_HEIGHT);
    }
  }, []);

  const hours = Array.from({ length: 24 }, (_, i) => i); // 0-23 (12am to 11pm)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getApptForSlot = (day, hour) => {
    return appointments.filter(a => {
      const d = parseISO(a.start_time);
      return isSameDay(d, day) && d.getHours() === hour;
    });
  };

  const statusColor = {
    scheduled: 'bg-blue-100 border-blue-300 text-blue-800',
    confirmed: 'bg-emerald-100 border-emerald-300 text-emerald-800',
    completed: 'bg-green-100 border-green-300 text-green-800',
    cancelled: 'bg-red-100 border-red-300 text-red-800',
    no_show: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  };

  return (
    <div data-testid="calendar-page" className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Calendar</h1>
          <p className="text-sm text-slate-500 mt-1">Doctor-wise scheduling and availability</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
            <SelectTrigger data-testid="calendar-doctor-filter" className="w-[200px]">
              <SelectValue placeholder="All Doctors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Doctors</SelectItem>
              {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button data-testid="new-appointment-btn" onClick={openBookingDialog} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg">
            <Plus className="h-4 w-4 mr-1.5" /> New Appointment
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Mini Calendar */}
        <Card className="rounded-xl border-slate-200/60 h-fit">
          <CardContent className="p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => {
                if (d) {
                  setSelectedDate(d);
                  setWeekStart(startOfWeek(d, { weekStartsOn: 1 }));
                }
              }}
              className="rounded-md"
            />
          </CardContent>
        </Card>

        {/* Week View */}
        <Card className="rounded-xl border-slate-200/60 overflow-hidden">
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-lg">{format(weekStart, 'MMMM yyyy')}</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                Today
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                {/* Day headers - sticky */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b sticky top-0 z-10 bg-white">
                  <div className="p-2" />
                  {weekDays.map((d, i) => (
                    <div key={i} className={`p-2 text-center border-l ${isSameDay(d, new Date()) ? 'bg-primary/10' : ''}`}>
                      <p className="text-xs text-slate-500">{format(d, 'EEE')}</p>
                      <p className={`text-sm font-semibold ${isSameDay(d, new Date()) ? 'text-primary' : 'text-slate-900'}`}>{format(d, 'd')}</p>
                    </div>
                  ))}
                </div>
                {/* Scrollable time slots */}
                <div ref={scrollRef} className="overflow-y-auto relative" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                  {/* Current time indicator */}
                  {weekDays.some(d => isSameDay(d, new Date())) && (() => {
                    const now = new Date();
                    const topPos = now.getHours() * ROW_HEIGHT + (now.getMinutes() / 60) * ROW_HEIGHT;
                    const todayIdx = weekDays.findIndex(d => isSameDay(d, new Date()));
                    return (
                      <div className="absolute z-[5] pointer-events-none" style={{ top: topPos, left: 60, right: 0 }}>
                        <div className="relative h-0">
                          <div className="absolute border-t-2 border-red-500" style={{
                            left: `calc(${(todayIdx / 7) * 100}%)`,
                            width: `calc(${(1 / 7) * 100}%)`,
                          }}>
                            <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  {hours.map(h => {
                    const isOffHours = h < 8 || h >= 18;
                    const label = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
                    return (
                      <div key={h} className="grid grid-cols-[60px_repeat(7,1fr)] border-b last:border-b-0" style={{ minHeight: ROW_HEIGHT }}>
                        <div className={`p-2 text-xs text-slate-400 text-right pr-3 pt-1 ${isOffHours ? 'bg-slate-50/50' : ''}`}>{label}</div>
                        {weekDays.map((d, i) => {
                          const appts = getApptForSlot(d, h);
                          return (
                            <div key={i} className={`border-l p-1 ${isSameDay(d, new Date()) ? 'bg-primary/5' : isOffHours ? 'bg-slate-50/30' : ''}`}>
                              {appts.map(a => (
                                <div key={a.id} data-testid={`cal-appt-${a.id}`} className={`text-xs p-1.5 rounded-md border mb-1 ${statusColor[a.status] || 'bg-slate-50'}`}>
                                  <p className="font-medium truncate">{a.patient?.full_name}</p>
                                  <p className="text-[10px] opacity-75 truncate">{a.doctor?.full_name}</p>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart Booking Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Book Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Step 1: Doctor */}
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">1. Select Doctor</Label>
              <Select value={form.doctor_id} onValueChange={(v) => { setForm({ ...form, doctor_id: v }); setSelectedSlot(null); }}>
                <SelectTrigger data-testid="appt-doctor-select" className="mt-1.5"><SelectValue placeholder="Choose a doctor" /></SelectTrigger>
                <SelectContent>{doctors.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color || '#2563EB' }} />
                      {d.full_name}
                    </span>
                  </SelectItem>
                ))}</SelectContent>
              </Select>
            </div>

            {/* Step 2: Duration */}
            {form.doctor_id && (
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">2. Appointment Duration</Label>
                <div className="flex gap-2 mt-1.5">
                  {[15, 30, 45, 60].map(d => (
                    <Button key={d} type="button" variant={duration === d ? 'default' : 'outline'} size="sm"
                      className={duration === d ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : ''} onClick={() => { setDuration(d); setSelectedSlot(null); }}>
                      {d} min
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Date */}
            {form.doctor_id && (
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">3. Select Date</Label>
                <div className="mt-1.5 flex justify-center">
                  <Calendar mode="single" selected={bookingDate} onSelect={(d) => { setBookingDate(d); setSelectedSlot(null); }}
                    disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))} className="rounded-md border" />
                </div>
              </div>
            )}

            {/* Step 4: Time Slot */}
            {form.doctor_id && bookingDate && (
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">4. Select Time Slot</Label>
                {slotsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : availableSlots.length === 0 ? (
                  <p className="text-sm text-slate-400 mt-2">No availability on this date</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 mt-1.5 max-h-[180px] overflow-y-auto">
                    {availableSlots.map((slot, i) => {
                      const isSelected = selectedSlot?.start_time === slot.start_time;
                      return (
                        <Button key={i} type="button" variant="outline" size="sm" disabled={!slot.available}
                          className={`text-xs ${isSelected ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' : slot.available ? 'hover:border-primary/30' : 'opacity-40 line-through'}`}
                          onClick={() => setSelectedSlot(slot)}>
                          <Clock className="h-3 w-3 mr-1" />
                          {slot.start_time}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Patient, Service, Notes */}
            {selectedSlot && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg p-2.5">
                  <Check className="h-4 w-4" />
                  <span>{format(bookingDate, 'EEE, MMM d')} at {selectedSlot.start_time} – {selectedSlot.end_time} ({duration} min)</span>
                </div>
                <div>
                  <Label>Patient *</Label>
                  <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                    <SelectTrigger data-testid="appt-patient-select" className="mt-1.5"><SelectValue placeholder="Select patient" /></SelectTrigger>
                    <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Service (optional)</Label>
                  <Select value={form.service_id} onValueChange={(v) => setForm({ ...form, service_id: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select service" /></SelectTrigger>
                    <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.duration_minutes}min)</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" className="mt-1.5" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button data-testid="appt-submit-btn" onClick={handleCreate} disabled={!form.doctor_id || !form.patient_id || !selectedSlot} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Book Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

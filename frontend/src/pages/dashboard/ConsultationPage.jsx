import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Trash2, Stethoscope, Pill, FlaskConical, CalendarClock, FileText, Activity } from 'lucide-react';
import { format, parseISO, differenceInYears } from 'date-fns';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from '@/components/PrescriptionPDF';

export default function ConsultationPage() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [appointment, setAppointment] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Consultation form
  const [form, setForm] = useState({
    chief_complaint: '',
    diagnosis: '',
    prescription_mode: 'structured',
    medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    free_text_prescription: '',
    lab_advice: '',
    follow_up_date: '',
    follow_up_notes: '',
    advice: '',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const [consultRes, tenantRes] = await Promise.all([
        api.get(`/appointments/${appointmentId}/consultation`),
        api.get('/tenant/me'),
      ]);
      setAppointment(consultRes.data.appointment);
      setTenant(tenantRes.data);

      // Pre-fill from existing prescription if resuming
      const rx = consultRes.data.prescription;
      if (rx) {
        setForm({
          chief_complaint: rx.chief_complaint || '',
          diagnosis: rx.diagnosis || '',
          prescription_mode: rx.prescription_mode || 'structured',
          medications: rx.medications?.length > 0
            ? rx.medications.map(m => ({ name: m.name || '', dosage: m.dosage || '', frequency: m.frequency || '', duration: m.duration || '', instructions: m.instructions || '' }))
            : [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
          free_text_prescription: rx.free_text_prescription || '',
          lab_advice: rx.lab_advice || '',
          follow_up_date: rx.follow_up_date || '',
          follow_up_notes: rx.follow_up_notes || '',
          advice: rx.advice || '',
          notes: rx.notes || '',
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load consultation data');
    }
    setLoading(false);
  }, [appointmentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addMedicine = () => {
    setForm(f => ({
      ...f,
      medications: [...f.medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    }));
  };

  const removeMedicine = (idx) => {
    setForm(f => ({
      ...f,
      medications: f.medications.filter((_, i) => i !== idx),
    }));
  };

  const updateMedicine = (idx, field, value) => {
    setForm(f => ({
      ...f,
      medications: f.medications.map((m, i) => i === idx ? { ...m, [field]: value } : m),
    }));
  };

  const buildPayload = () => {
    const meds = form.medications.filter(m => m.name.trim());
    return {
      patient_id: appointment.patient_id,
      pet_id: appointment.pet_id || undefined,
      chief_complaint: form.chief_complaint || undefined,
      diagnosis: form.diagnosis || undefined,
      prescription_mode: form.prescription_mode,
      medications: form.prescription_mode === 'structured' ? (meds.length > 0 ? meds : undefined) : undefined,
      free_text_prescription: form.prescription_mode === 'freetext' ? form.free_text_prescription : undefined,
      lab_advice: form.lab_advice || undefined,
      follow_up_date: form.follow_up_date || undefined,
      follow_up_notes: form.follow_up_notes || undefined,
      advice: form.advice || undefined,
      notes: form.notes || undefined,
      prescribed_date: new Date().toISOString(),
    };
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const payload = buildPayload();
      const rxRes = await api.post(`/appointments/${appointmentId}/complete-consultation`, payload);
      toast.success('Consultation completed!');

      // Generate and download prescription PDF
      try {
        const blob = await pdf(
          <PrescriptionPDF
            prescription={rxRes.data}
            tenant={tenant}
            doctor={appointment.doctor}
            patient={appointment.patient}
            pet={appointment.pet}
          />
        ).toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const name = appointment.pet?.name || appointment.patient?.full_name || 'patient';
        a.download = `prescription_${name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Prescription PDF downloaded');
      } catch (pdfErr) {
        console.error('PDF generation error:', pdfErr);
        toast.info('Consultation saved. PDF can be downloaded later.');
      }

      navigate('/dashboard/appointments');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to complete consultation');
    }
    setCompleting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Appointment not found</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const a = appointment;
  const isPetClinic = tenant?.type === 'pet_clinic';
  const patientName = a.pet?.name || a.patient?.full_name || 'N/A';
  const isReadOnly = a.status === 'completed';

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" /> Consultation
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {format(parseISO(a.start_time), 'MMM d, yyyy')} at {format(parseISO(a.start_time), 'h:mm a')}
          </p>
        </div>
        {isReadOnly && (
          <Badge className="bg-green-100 text-green-700 rounded-full">Completed</Badge>
        )}
      </div>

      {/* Patient/Pet Summary */}
      <Card className="rounded-xl border-slate-200/60">
        <CardContent className="py-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-xs text-slate-400 uppercase">{isPetClinic ? 'Patient (Pet)' : 'Patient'}</p>
              <p className="text-sm font-semibold text-slate-900">{patientName}</p>
              {a.pet && <p className="text-xs text-slate-500">{[a.pet.species, a.pet.breed].filter(Boolean).join(' - ')}</p>}
            </div>
            {a.pet && (
              <div>
                <p className="text-xs text-slate-400 uppercase">Owner</p>
                <p className="text-sm font-semibold text-slate-900">{a.pet.owner?.full_name || a.patient?.full_name}</p>
                {a.patient?.phone && <p className="text-xs text-slate-500">{a.patient.phone}</p>}
              </div>
            )}
            {!a.pet && a.patient?.phone && (
              <div>
                <p className="text-xs text-slate-400 uppercase">Phone</p>
                <p className="text-sm text-slate-900">{a.patient.phone}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-400 uppercase">Doctor</p>
              <p className="text-sm font-semibold text-slate-900">Dr. {a.doctor?.full_name}</p>
              {a.doctor?.specialization && <p className="text-xs text-slate-500">{a.doctor.specialization}</p>}
            </div>
            {a.service && (
              <div>
                <p className="text-xs text-slate-400 uppercase">Service</p>
                <p className="text-sm text-slate-900">{a.service.name}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vitals Summary */}
      {a.vitals && (
        <Card className="rounded-xl border-green-200/60 bg-green-50/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-green-600" />
              <p className="text-sm font-semibold text-green-800">Vitals</p>
              {a.vitals_recorded_at && (
                <span className="text-xs text-green-600 ml-auto">
                  Recorded {format(parseISO(a.vitals_recorded_at), 'MMM d, yyyy h:mm a')}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {a.vitals.weight && (
                <div className="text-center p-2 bg-white rounded-lg border border-green-100">
                  <p className="text-xs text-slate-500">Weight</p>
                  <p className="text-sm font-bold text-slate-900">{a.vitals.weight} kg</p>
                </div>
              )}
              {a.vitals.temperature && (
                <div className="text-center p-2 bg-white rounded-lg border border-green-100">
                  <p className="text-xs text-slate-500">Temp</p>
                  <p className="text-sm font-bold text-slate-900">{a.vitals.temperature}°F</p>
                </div>
              )}
              {a.vitals.heart_rate && (
                <div className="text-center p-2 bg-white rounded-lg border border-green-100">
                  <p className="text-xs text-slate-500">Heart Rate</p>
                  <p className="text-sm font-bold text-slate-900">{a.vitals.heart_rate} bpm</p>
                </div>
              )}
              {a.vitals.respiratory_rate && (
                <div className="text-center p-2 bg-white rounded-lg border border-green-100">
                  <p className="text-xs text-slate-500">Resp. Rate</p>
                  <p className="text-sm font-bold text-slate-900">{a.vitals.respiratory_rate}</p>
                </div>
              )}
              {a.vitals.blood_pressure && (
                <div className="text-center p-2 bg-white rounded-lg border border-green-100">
                  <p className="text-xs text-slate-500">BP</p>
                  <p className="text-sm font-bold text-slate-900">{a.vitals.blood_pressure}</p>
                </div>
              )}
            </div>
            {a.vitals.notes && (
              <p className="text-xs text-slate-600 mt-2"><span className="font-medium">Notes:</span> {a.vitals.notes}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Consultation Form */}
      <Card className="rounded-xl border-slate-200/60">
        <CardHeader>
          <CardTitle className="text-lg">Consultation Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Chief Complaint */}
          <div>
            <Label className="flex items-center gap-1.5 mb-2">
              <FileText className="h-4 w-4 text-slate-400" /> Chief Complaint / Reason for Visit
            </Label>
            <Textarea
              value={form.chief_complaint}
              onChange={e => setForm(f => ({ ...f, chief_complaint: e.target.value }))}
              placeholder="Describe the patient's primary complaint or reason for visit..."
              rows={3}
              disabled={isReadOnly}
            />
          </div>

          {/* Diagnosis */}
          <div>
            <Label className="flex items-center gap-1.5 mb-2">
              <Stethoscope className="h-4 w-4 text-slate-400" /> Diagnosis
            </Label>
            <Textarea
              value={form.diagnosis}
              onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))}
              placeholder="Clinical diagnosis..."
              rows={2}
              disabled={isReadOnly}
            />
          </div>

          {/* Prescription */}
          <div className="border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <Label className="flex items-center gap-1.5 text-base font-semibold">
                <Pill className="h-4 w-4 text-primary" /> Prescription
              </Label>
              {!isReadOnly && (
                <div className="flex items-center gap-2 text-sm">
                  <span className={form.prescription_mode === 'structured' ? 'font-medium text-slate-900' : 'text-slate-400'}>Structured</span>
                  <Switch
                    checked={form.prescription_mode === 'freetext'}
                    onCheckedChange={v => setForm(f => ({ ...f, prescription_mode: v ? 'freetext' : 'structured' }))}
                  />
                  <span className={form.prescription_mode === 'freetext' ? 'font-medium text-slate-900' : 'text-slate-400'}>Free Text</span>
                </div>
              )}
            </div>

            {form.prescription_mode === 'freetext' ? (
              <Textarea
                value={form.free_text_prescription}
                onChange={e => setForm(f => ({ ...f, free_text_prescription: e.target.value }))}
                placeholder="Write prescription in free-form text..."
                rows={6}
                disabled={isReadOnly}
              />
            ) : (
              <div className="space-y-3">
                {/* Medicine table header */}
                <div className="hidden md:grid grid-cols-[2fr_1fr_1.5fr_1fr_1.5fr_auto] gap-2 text-xs font-semibold text-slate-400 uppercase px-1">
                  <span>Medicine</span>
                  <span>Dosage</span>
                  <span>Frequency</span>
                  <span>Duration</span>
                  <span>Instructions</span>
                  <span></span>
                </div>
                {form.medications.map((m, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1.5fr_1fr_1.5fr_auto] gap-2 p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                    <Input
                      placeholder="Medicine name"
                      value={m.name}
                      onChange={e => updateMedicine(i, 'name', e.target.value)}
                      disabled={isReadOnly}
                    />
                    <Input
                      placeholder="e.g. 500mg"
                      value={m.dosage}
                      onChange={e => updateMedicine(i, 'dosage', e.target.value)}
                      disabled={isReadOnly}
                    />
                    <Input
                      placeholder="e.g. Twice daily"
                      value={m.frequency}
                      onChange={e => updateMedicine(i, 'frequency', e.target.value)}
                      disabled={isReadOnly}
                    />
                    <Input
                      placeholder="e.g. 7 days"
                      value={m.duration}
                      onChange={e => updateMedicine(i, 'duration', e.target.value)}
                      disabled={isReadOnly}
                    />
                    <Input
                      placeholder="Instructions"
                      value={m.instructions}
                      onChange={e => updateMedicine(i, 'instructions', e.target.value)}
                      disabled={isReadOnly}
                    />
                    {!isReadOnly && form.medications.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeMedicine(i)} className="h-9 w-9 text-red-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {!isReadOnly && (
                  <Button variant="outline" size="sm" onClick={addMedicine} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Add Medicine
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Lab Advice */}
          <div className="border-t border-slate-100 pt-6">
            <Label className="flex items-center gap-1.5 mb-2">
              <FlaskConical className="h-4 w-4 text-blue-500" /> Lab / Investigation Advice
            </Label>
            <Textarea
              value={form.lab_advice}
              onChange={e => setForm(f => ({ ...f, lab_advice: e.target.value }))}
              placeholder="Recommended lab tests, imaging, or investigations..."
              rows={3}
              disabled={isReadOnly}
            />
          </div>

          {/* Follow-up */}
          <div className="border-t border-slate-100 pt-6">
            <Label className="flex items-center gap-1.5 mb-2">
              <CalendarClock className="h-4 w-4 text-amber-500" /> Follow-up Recommendation
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3">
              <div>
                <Label className="text-xs text-slate-400">Follow-up Date</Label>
                <Input
                  type="date"
                  value={form.follow_up_date}
                  onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))}
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <Label className="text-xs text-slate-400">Notes</Label>
                <Input
                  value={form.follow_up_notes}
                  onChange={e => setForm(f => ({ ...f, follow_up_notes: e.target.value }))}
                  placeholder="Follow-up instructions..."
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>

          {/* General Advice */}
          <div className="border-t border-slate-100 pt-6">
            <Label className="flex items-center gap-1.5 mb-2">General Advice / Instructions</Label>
            <Textarea
              value={form.advice}
              onChange={e => setForm(f => ({ ...f, advice: e.target.value }))}
              placeholder="Diet recommendations, activity restrictions, precautions..."
              rows={3}
              disabled={isReadOnly}
            />
          </div>

          {/* Additional Notes */}
          <div>
            <Label className="mb-2">Additional Notes</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any other notes for this consultation..."
              rows={2}
              disabled={isReadOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Bar */}
      {!isReadOnly && (
        <div className="flex items-center justify-end gap-3 pb-6">
          <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button
            onClick={handleComplete}
            disabled={completing}
            className="gap-1.5"
          >
            <Stethoscope className="h-4 w-4" />
            {completing ? 'Completing...' : 'Complete & Generate Prescription'}
          </Button>
        </div>
      )}
    </div>
  );
}

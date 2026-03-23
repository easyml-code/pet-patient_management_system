import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft, Mail, Phone, Calendar, Clock, User, MapPin,
  GraduationCap, Stethoscope, FileText, Award, Shield
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const STATUS_STYLES = {
  scheduled: 'bg-primary/15 text-primary',
  confirmed: 'bg-emerald-100 text-emerald-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-yellow-100 text-yellow-700',
};

export default function MemberDetailPage() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const isDoctor = location.pathname.includes('/staff/doctor/');
  const currentIsAdmin = profile?.is_admin || profile?.role === 'admin';

  const [member, setMember] = useState(null);
  const [memberUser, setMemberUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const endpoint = isDoctor ? `/doctors/${memberId}` : `/staff/${memberId}`;
      const memberRes = await api.get(endpoint);
      setMember(memberRes.data);

      // Fetch user record if member has user_id (for role management)
      if (memberRes.data.user_id) {
        try {
          const userRes = await api.get(`/members/${memberRes.data.user_id}`);
          setMemberUser(userRes.data);
        } catch { /* member may not have a linked user */ }
      }

      if (isDoctor) {
        const apptRes = await api.get('/appointments', { params: { doctor_id: memberId, limit: 50 } });
        setAppointments(apptRes.data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [memberId, isDoctor]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggleAdmin = async (checked) => {
    if (!memberUser) return;
    setSavingRole(true);
    try {
      await api.put(`/members/${memberUser.id}/role`, { is_admin: checked });
      setMemberUser(prev => ({ ...prev, is_admin: checked }));
      toast.success(checked ? 'Admin access granted' : 'Admin access revoked');
    } catch (err) {
      toast.error('Failed to update role');
    }
    setSavingRole(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Member not found</p>
        <Button variant="outline" onClick={() => navigate('/dashboard/staff')} className="mt-4">Back to Team</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/staff')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          {member.photo_url ? (
            <img src={member.photo_url} alt={member.full_name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-200" />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shrink-0"
              style={{ backgroundColor: member.color || (isDoctor ? '#2563EB' : '#6366F1') }}
            >
              {member.full_name?.charAt(0)?.toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{member.full_name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={`rounded-full text-xs capitalize ${isDoctor ? 'bg-primary/15 text-primary' : 'bg-violet-100 text-violet-700'}`}>
                {isDoctor ? 'Doctor' : 'Staff'}
              </Badge>
              {memberUser?.is_admin && (
                <Badge className="rounded-full text-xs bg-slate-900 text-white">
                  <Shield className="h-3 w-3 mr-1" /> Admin
                </Badge>
              )}
              {isDoctor && member.specialization && (
                <Badge variant="outline" className="rounded-full text-xs">{member.specialization}</Badge>
              )}
              {!isDoctor && member.role && (
                <Badge variant="outline" className="rounded-full text-xs">{member.role}</Badge>
              )}
              <Badge className={`rounded-full text-xs ${member.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {member.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <Card className="rounded-xl border-slate-200/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow label="Full Name" value={member.full_name} />
            <InfoRow label="Email" value={member.email} icon={<Mail className="h-3.5 w-3.5 text-slate-400" />} />
            <InfoRow label="Phone" value={member.phone} icon={<Phone className="h-3.5 w-3.5 text-slate-400" />} />
            <InfoRow label="Address" value={member.address} icon={<MapPin className="h-3.5 w-3.5 text-slate-400" />} />
            <InfoRow label="Joined" value={member.created_at ? format(parseISO(member.created_at), 'MMM d, yyyy') : null} icon={<Calendar className="h-3.5 w-3.5 text-slate-400" />} />
          </CardContent>
        </Card>

        {/* Professional Details */}
        <Card className="rounded-xl border-slate-200/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {isDoctor ? <Stethoscope className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
              {isDoctor ? 'Professional Details' : 'Role Details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {isDoctor ? (
              <>
                <InfoRow label="Specialization" value={member.specialization} icon={<Stethoscope className="h-3.5 w-3.5 text-slate-400" />} />
                <InfoRow label="Qualification" value={member.qualification} icon={<GraduationCap className="h-3.5 w-3.5 text-slate-400" />} />
                <InfoRow label="License No." value={member.license_number} icon={<Award className="h-3.5 w-3.5 text-slate-400" />} />
                <InfoRow label="Registration No." value={member.registration_number} icon={<FileText className="h-3.5 w-3.5 text-slate-400" />} />
                <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-500">Calendar Color</span>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: member.color || '#2563EB' }} />
                    <span className="text-sm text-slate-700">{member.color || '#2563EB'}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <InfoRow label="Role / Title" value={member.role} />
                <InfoRow label="Qualification" value={member.qualification} icon={<GraduationCap className="h-3.5 w-3.5 text-slate-400" />} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Admin Role Management (admin only) */}
        {currentIsAdmin && memberUser && (
          <Card className="rounded-xl border-slate-200/60 md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Access & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Admin Access</Label>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Grant this {isDoctor ? 'doctor' : 'staff member'} admin privileges (settings, team management, analytics)
                  </p>
                </div>
                <Switch
                  checked={memberUser.is_admin}
                  onCheckedChange={handleToggleAdmin}
                  disabled={savingRole}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Appointment Stats (doctors only) */}
        {isDoctor && (
          <Card className="rounded-xl border-slate-200/60 md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Appointment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBox label="Total" value={appointments.length} color="bg-primary/10 text-primary" />
                <StatBox label="Completed" value={appointments.filter(a => a.status === 'completed').length} color="bg-green-50 text-green-700" />
                <StatBox label="Scheduled" value={appointments.filter(a => ['scheduled', 'confirmed'].includes(a.status)).length} color="bg-blue-50 text-blue-700" />
                <StatBox label="Cancelled" value={appointments.filter(a => a.status === 'cancelled').length} color="bg-red-50 text-red-700" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Appointment History (doctors only) */}
      {isDoctor && appointments.length > 0 && (
        <Card className="rounded-xl border-slate-200/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Recent Appointments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Service</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.slice(0, 20).map(a => {
                  const start = parseISO(a.start_time);
                  const end = parseISO(a.end_time);
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <p className="text-sm font-medium text-slate-900">{format(start, 'MMM d, yyyy')}</p>
                        <p className="text-xs text-slate-500">{format(start, 'h:mm a')} – {format(end, 'h:mm a')}</p>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">{a.patient?.full_name || '-'}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-slate-500">{a.service?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge className={`rounded-full text-xs capitalize ${STATUS_STYLES[a.status] || 'bg-slate-100 text-slate-600'}`}>
                          {a.status?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
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

function StatBox({ label, value, color }) {
  return (
    <div className={`rounded-lg p-4 text-center ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-1">{label}</p>
    </div>
  );
}

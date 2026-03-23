import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Stethoscope, UserCog, Clock, Check, XCircle, AlertTriangle, Play } from 'lucide-react';
import { format } from 'date-fns';

export default function OverviewPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const userRole = profile?.role || 'staff';
  const isAdmin = profile?.is_admin || profile?.role === 'admin';
  const isAdminOrStaff = isAdmin || userRole === 'staff';
  const [analytics, setAnalytics] = useState(null);
  const [todayAppts, setTodayAppts] = useState([]);
  const [tenantType, setTenantType] = useState('human_clinic');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [analyticsRes, todayRes, tenantRes] = await Promise.allSettled([
        api.get('/analytics/overview'),
        api.get('/appointments/today'),
        api.get('/tenant/me'),
      ]);
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data);
      if (todayRes.status === 'fulfilled') setTodayAppts(todayRes.value.data);
      if (tenantRes.status === 'fulfilled') setTenantType(tenantRes.value.data.type || 'human_clinic');
      setLoading(false);
    };
    fetchData();
  }, []);

  const isPetClinic = tenantType === 'pet_clinic';

  const statusColor = {
    scheduled: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    in_progress: 'bg-orange-100 text-orange-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    no_show: 'bg-yellow-100 text-yellow-700',
  };

  const stats = analytics ? [
    { label: userRole === 'doctor' ? 'My Appointments Today' : 'Today\'s Appointments', value: analytics.today_appointments, icon: Calendar, color: 'text-primary', bg: 'bg-primary/10', link: '/dashboard/appointments?date=today' },
    { label: userRole === 'doctor' ? 'My Total Appointments' : 'Total Patients', value: userRole === 'doctor' ? analytics.total_appointments : analytics.total_patients, icon: userRole === 'doctor' ? Calendar : Users, color: 'text-emerald-600', bg: 'bg-emerald-50/80', link: userRole === 'doctor' ? '/dashboard/appointments' : '/dashboard/patients' },
    ...(isAdminOrStaff ? [
      { label: 'Doctors', value: analytics.total_doctors, icon: Stethoscope, color: 'text-violet-600', bg: 'bg-violet-50', link: '/dashboard/staff?tab=doctors' },
      { label: 'Staff Members', value: analytics.total_staff, icon: UserCog, color: 'text-amber-600', bg: 'bg-amber-50', link: '/dashboard/staff?tab=staff' },
    ] : []),
  ] : [];

  // Group appointments by doctor for admin/staff view
  const groupedByDoctor = {};
  todayAppts.forEach(a => {
    const docId = a.doctor_id;
    const docName = a.doctor?.full_name || 'Unassigned';
    const docColor = a.doctor?.color || '#2563EB';
    if (!groupedByDoctor[docId]) {
      groupedByDoctor[docId] = { name: docName, color: docColor, appointments: [] };
    }
    groupedByDoctor[docId].appointments.push(a);
  });

  // Get display name for an appointment
  const getDisplayName = (a) => {
    if (isPetClinic && a.pet) {
      return a.pet.name;
    }
    return a.patient?.full_name || '-';
  };

  const getSubtext = (a) => {
    if (isPetClinic && a.pet) {
      const parts = [];
      if (a.pet.species) parts.push(a.pet.species);
      if (a.patient?.full_name) parts.push(`Owner: ${a.patient.full_name}`);
      if (a.service?.name) parts.push(a.service.name);
      return parts.join(' · ');
    }
    const parts = [];
    if (a.doctor?.full_name) parts.push(a.doctor.full_name);
    if (a.service?.name) parts.push(a.service.name);
    return parts.join(' · ');
  };

  const handleApptClick = (a) => {
    // For doctors: if scheduled/confirmed, go to initiate (consult page)
    if (userRole === 'doctor' && ['scheduled', 'confirmed'].includes(a.status)) {
      navigate(`/dashboard/appointments/${a.id}/consult`);
    } else if (isPetClinic && a.pet_id) {
      navigate(`/dashboard/pets/${a.pet_id}`);
    } else {
      navigate(`/dashboard/patients/${a.patient_id}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="overview-page" className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Welcome back. Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s, i) => (
          <Card key={i} data-testid={`stat-card-${i}`} className="rounded-xl border-slate-200/60 hover:shadow-md cursor-pointer transition-shadow" onClick={() => navigate(s.link)}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{s.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{s.value}</p>
                </div>
                <div className={`w-11 h-11 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today's Quick Stats */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Card className="rounded-xl border-slate-200/60 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/dashboard/appointments?status=completed&date=today')}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Completed Today</p>
                <p className="text-2xl font-bold text-slate-900">{analytics.completed_today}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-slate-200/60 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/dashboard/appointments?status=no_show&date=today')}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">No-Shows Today</p>
                <p className="text-2xl font-bold text-slate-900">{analytics.no_shows_today}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-slate-200/60 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/dashboard/appointments?status=cancelled&date=today')}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Cancelled Today</p>
                <p className="text-2xl font-bold text-slate-900">{analytics.cancelled_today}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Today's Schedule */}
      <Card className="rounded-xl border-slate-200/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayAppts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No appointments scheduled for today</p>
            </div>
          ) : isAdminOrStaff ? (
            /* Admin/Staff: grouped by doctor */
            <div className="space-y-6">
              {Object.entries(groupedByDoctor).map(([docId, group]) => {
                const completed = group.appointments.filter(a => a.status === 'completed').length;
                const inProgress = group.appointments.filter(a => a.status === 'in_progress').length;
                const scheduled = group.appointments.filter(a => ['scheduled', 'confirmed'].includes(a.status)).length;
                return (
                  <div key={docId}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                      <span className="text-sm font-semibold text-slate-900">{group.name}</span>
                      <div className="flex items-center gap-2 ml-auto text-xs">
                        {completed > 0 && <span className="text-green-600">{completed} done</span>}
                        {inProgress > 0 && <span className="text-orange-600">{inProgress} in progress</span>}
                        {scheduled > 0 && <span className="text-blue-600">{scheduled} upcoming</span>}
                      </div>
                    </div>
                    <div className="space-y-2 ml-1.5 border-l-2 pl-4" style={{ borderColor: group.color + '40' }}>
                      {group.appointments.map(a => (
                        <div
                          key={a.id}
                          className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 cursor-pointer"
                          onClick={() => handleApptClick(a)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900">{getDisplayName(a)}</p>
                            <p className="text-xs text-slate-500">{getSubtext(a)}</p>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <div>
                              <p className="text-sm font-medium text-slate-700">
                                {format(new Date(a.start_time), 'h:mm a')}
                              </p>
                              <Badge className={`text-xs rounded-full ${statusColor[a.status] || 'bg-slate-100 text-slate-700'}`}>
                                {a.status?.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Doctor: flat list */
            <div className="space-y-3">
              {todayAppts.map((a) => (
                <div
                  key={a.id}
                  data-testid={`today-appt-${a.id}`}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 cursor-pointer"
                  onClick={() => handleApptClick(a)}
                >
                  <div className="w-1 h-12 rounded-full" style={{ backgroundColor: a.doctor?.color || '#2563EB' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{getDisplayName(a)}</p>
                    <p className="text-xs text-slate-500">{getSubtext(a)}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    {['scheduled', 'confirmed'].includes(a.status) && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center" title="Start consultation">
                        <Play className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {format(new Date(a.start_time), 'h:mm a')}
                      </p>
                      <Badge className={`text-xs rounded-full ${statusColor[a.status] || 'bg-slate-100 text-slate-700'}`}>
                        {a.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

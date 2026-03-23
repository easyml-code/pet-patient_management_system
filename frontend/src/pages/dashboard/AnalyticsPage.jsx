import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

export default function AnalyticsPage() {
  const [trends, setTrends] = useState([]);
  const [utilization, setUtilization] = useState([]);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [t, u, o] = await Promise.all([
          api.get('/analytics/appointments-trend?days=30'),
          api.get('/analytics/doctor-utilization'),
          api.get('/analytics/overview'),
        ]);
        setTrends(t.data);
        setUtilization(u.data);
        setOverview(o.data);
      } catch (e) { console.error(e); }
    };
    fetch();
  }, []);

  const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div data-testid="analytics-page" className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Utilization, trends, and performance insights</p>
      </div>

      {/* Summary Cards */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="rounded-xl border-slate-200/60"><CardContent className="p-5"><p className="text-sm text-slate-500">Total Appointments</p><p className="text-3xl font-bold text-slate-900 mt-1">{overview.total_appointments}</p></CardContent></Card>
          <Card className="rounded-xl border-slate-200/60"><CardContent className="p-5"><p className="text-sm text-slate-500">Total Patients</p><p className="text-3xl font-bold text-slate-900 mt-1">{overview.total_patients}</p></CardContent></Card>
          <Card className="rounded-xl border-slate-200/60"><CardContent className="p-5"><p className="text-sm text-slate-500">Today's Completed</p><p className="text-3xl font-bold text-green-600 mt-1">{overview.completed_today}</p></CardContent></Card>
          <Card className="rounded-xl border-slate-200/60"><CardContent className="p-5"><p className="text-sm text-slate-500">Today's No-Shows</p><p className="text-3xl font-bold text-yellow-600 mt-1">{overview.no_shows_today}</p></CardContent></Card>
        </div>
      )}

      {/* Appointment Trends */}
      <Card className="rounded-xl border-slate-200/60">
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Appointment Trends (30 days)</CardTitle></CardHeader>
        <CardContent>
          {trends.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No data yet. Appointments will appear here once booked.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="completed" stackId="a" fill="#10B981" name="Completed" radius={[0,0,0,0]} />
                <Bar dataKey="cancelled" stackId="a" fill="#EF4444" name="Cancelled" />
                <Bar dataKey="no_show" stackId="a" fill="#F59E0B" name="No Show" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Doctor Utilization */}
      <Card className="rounded-xl border-slate-200/60">
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Doctor Utilization (30 days)</CardTitle></CardHeader>
        <CardContent>
          {utilization.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No doctor data yet.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={utilization} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="doctor_name" type="category" tick={{ fontSize: 12 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="total_appointments" fill="#2563EB" name="Appointments" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {utilization.map((d, i) => (
                  <div key={d.doctor_id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color || COLORS[i % COLORS.length] }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{d.doctor_name}</p>
                      <div className="flex gap-3 mt-0.5 text-xs text-slate-500">
                        <span>{d.total_appointments} appts</span>
                        <span className="text-green-600">{d.completed} completed</span>
                        <span className="text-yellow-600">{d.no_shows} no-shows</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

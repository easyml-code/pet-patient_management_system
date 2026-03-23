import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try { setNotifications((await api.get('/notifications')).data); } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const markRead = async (id) => {
    try { await api.put(`/notifications/${id}/read`); fetch(); } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    try { await api.put('/notifications/mark-all-read'); fetch(); } catch (e) { console.error(e); }
  };

  const typeIcon = {
    appointment_booked: 'bg-blue-100 text-blue-600',
    appointment_completed: 'bg-green-100 text-green-600',
    appointment_cancelled: 'bg-red-100 text-red-600',
    appointment_no_show: 'bg-yellow-100 text-yellow-600',
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div data-testid="notifications-page" className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
        </div>
        {unreadCount > 0 && (
          <Button data-testid="mark-all-read-btn" variant="outline" onClick={markAllRead} className="rounded-lg">
            <CheckCheck className="h-4 w-4 mr-1.5" /> Mark All Read
          </Button>
        )}
      </div>

      <Card className="rounded-xl border-slate-200/60">
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">{loading ? 'Loading...' : 'No notifications yet'}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map(n => (
                <div
                  key={n.id}
                  data-testid={`notification-${n.id}`}
                  className={`flex items-start gap-4 p-4 hover:bg-slate-50 ${!n.is_read ? 'bg-primary/5' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${typeIcon[n.type] || 'bg-slate-100 text-slate-600'}`}>
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{n.title}</p>
                      {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    {n.message && <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>}
                    <p className="text-xs text-slate-400 mt-1">{n.created_at ? format(new Date(n.created_at), 'MMM d, h:mm a') : ''}</p>
                  </div>
                  {!n.is_read && (
                    <Button variant="ghost" size="sm" onClick={() => markRead(n.id)} className="shrink-0">
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

from pydantic import BaseModel


class AnalyticsOverview(BaseModel):
    total_appointments: int
    total_patients: int
    total_doctors: int
    total_staff: int
    today_appointments: int
    completed_today: int
    no_shows_today: int
    cancelled_today: int


class AppointmentTrend(BaseModel):
    date: str
    count: int
    completed: int
    cancelled: int
    no_show: int

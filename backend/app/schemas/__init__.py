from app.schemas.auth import RegisterRequest, LoginRequest, UserResponse, TokenResponse
from app.schemas.tenant import TenantUpdate, TenantResponse
from app.schemas.doctor import DoctorCreate, DoctorUpdate, DoctorResponse
from app.schemas.patient import PatientCreate, PatientUpdate, PatientResponse
from app.schemas.service import ServiceCreate, ServiceUpdate, ServiceResponse
from app.schemas.availability import AvailabilityCreate, AvailabilityUpdate, AvailabilityResponse
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentResponse
from app.schemas.staff import StaffCreate, StaffUpdate, StaffResponse
from app.schemas.notification import NotificationCreate, NotificationResponse
from app.schemas.analytics import AnalyticsOverview, AppointmentTrend
from app.schemas.pet import PetCreate, PetUpdate, PetResponse
from app.schemas.medical_record import MedicalRecordCreate, MedicalRecordUpdate, MedicalRecordResponse
from app.schemas.prescription import PrescriptionCreate, PrescriptionUpdate, PrescriptionResponse
from app.schemas.report import ReportCreate, ReportUpdate, ReportResponse

__all__ = [
    "RegisterRequest", "LoginRequest", "UserResponse", "TokenResponse",
    "TenantUpdate", "TenantResponse",
    "DoctorCreate", "DoctorUpdate", "DoctorResponse",
    "PatientCreate", "PatientUpdate", "PatientResponse",
    "ServiceCreate", "ServiceUpdate", "ServiceResponse",
    "AvailabilityCreate", "AvailabilityUpdate", "AvailabilityResponse",
    "AppointmentCreate", "AppointmentUpdate", "AppointmentResponse",
    "StaffCreate", "StaffUpdate", "StaffResponse",
    "NotificationCreate", "NotificationResponse",
    "AnalyticsOverview", "AppointmentTrend",
    "PetCreate", "PetUpdate", "PetResponse",
    "MedicalRecordCreate", "MedicalRecordUpdate", "MedicalRecordResponse",
    "PrescriptionCreate", "PrescriptionUpdate", "PrescriptionResponse",
    "ReportCreate", "ReportUpdate", "ReportResponse",
]

from log.log import setup_logging

# Must be called before any other import that touches logging
setup_logging()

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.middleware import RequestContextMiddleware
from app.metrics import setup_metrics
from app.routes.auth_routes import router as auth_router, tenant_router
from app.routes.doctor_routes import router as doctor_router
from app.routes.patient_routes import router as patient_router
from app.routes.appointment_routes import router as appointment_router
from app.routes.service_routes import router as service_router
from app.routes.staff_routes import router as staff_router
from app.routes.availability_routes import router as availability_router
from app.routes.analytics_routes import router as analytics_router
from app.routes.notification_routes import router as notification_router
from app.routes.medical_record_routes import router as medical_record_router
from app.routes.prescription_routes import router as prescription_router
from app.routes.report_routes import router as report_router
from app.routes.invitation_routes import router as invitation_router
from app.routes.member_routes import router as member_router
from app.routes.pet_routes import router as pet_router
from app.routes.profile_routes import router as profile_router

app = FastAPI(title="Zap AI - Clinic Booking Platform API", version="1.0.0")
setup_metrics(app)

# Request context must be first so request_id is set before anything logs
app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.cors_origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(tenant_router)
app.include_router(doctor_router)
app.include_router(patient_router)
app.include_router(appointment_router)
app.include_router(service_router)
app.include_router(staff_router)
app.include_router(availability_router)
app.include_router(analytics_router)
app.include_router(notification_router)
app.include_router(medical_record_router)
app.include_router(prescription_router)
app.include_router(report_router)
app.include_router(invitation_router)
app.include_router(member_router)
app.include_router(pet_router)
app.include_router(profile_router)


@app.get("/api")
async def root():
    return {"message": "Zap AI Clinic Booking Platform API", "version": "1.0.0"}


@app.get("/api/health")
async def health():
    return {"status": "ok"}

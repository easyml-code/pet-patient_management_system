"""
Seed script: creates 2 demo clinics with staff, patients, and appointments.
  - Clinic 1: Human clinic (theme: blue)
  - Clinic 2: Pet/vet clinic (theme: emerald)

Each clinic gets: 1 admin, 2 doctors, 2 staff, 5 patients
Pet clinic also gets: 5 pets, some appointments with pet_id

Usage:
    cd backend
    python seed.py
"""

import asyncio
import uuid
from datetime import datetime, timezone, date, timedelta

from supabase import create_client
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models import (
    Tenant, User, Doctor, Staff, Patient, Service,
    Availability, Appointment, Pet, Notification
)

# ── Supabase admin client ──────────────────────────────────────
sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

# ── Async DB engine ────────────────────────────────────────────
engine = create_async_engine(settings.ASYNC_DATABASE_URL)
SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def uid():
    return str(uuid.uuid4())


def create_supabase_user(email, password, full_name):
    """Create a Supabase auth user and return its id."""
    resp = sb.auth.admin.create_user({
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {"full_name": full_name},
    })
    return str(resp.user.id)


async def seed():
    async with SessionLocal() as db:
        print("🌱 Seeding database...")

        # ════════════════════════════════════════════════════════════
        # CLINIC 1: Human Clinic
        # ════════════════════════════════════════════════════════════
        t1 = Tenant(
            id=uid(), name="Sunshine Family Clinic", type="human_clinic",
            email="info@sunshineclinic.com", phone="+1 555-0100",
            address="123 Health Street", city="Mumbai", state="Maharashtra",
            country="India", postal_code="400001", timezone="Asia/Kolkata",
            theme_color="#2563EB",
            description="Multi-specialty family clinic",
        )
        db.add(t1)
        await db.flush()
        print(f"  ✅ Tenant: {t1.name} (id={t1.id})")

        # Admin
        admin1_id = create_supabase_user("admin@sunshineclinic.com", "Test@123", "Dr. Rahul Sharma")
        admin1 = User(id=admin1_id, tenant_id=t1.id, email="admin@sunshineclinic.com", full_name="Dr. Rahul Sharma", role="admin")
        db.add(admin1)
        print(f"  ✅ Admin: {admin1.full_name}")

        # Doctors - create users first, flush, then create doctor records
        doc1_1_auth = create_supabase_user("priya@sunshineclinic.com", "Test@123", "Dr. Priya Patel")
        doc1_1_user = User(id=doc1_1_auth, tenant_id=t1.id, email="priya@sunshineclinic.com", full_name="Dr. Priya Patel", role="doctor")
        doc1_2_auth = create_supabase_user("ankit@sunshineclinic.com", "Test@123", "Dr. Ankit Verma")
        doc1_2_user = User(id=doc1_2_auth, tenant_id=t1.id, email="ankit@sunshineclinic.com", full_name="Dr. Ankit Verma", role="doctor")

        # Staff users
        staff1_1_auth = create_supabase_user("meera@sunshineclinic.com", "Test@123", "Meera Joshi")
        staff1_1_user = User(id=staff1_1_auth, tenant_id=t1.id, email="meera@sunshineclinic.com", full_name="Meera Joshi", role="staff")
        staff1_2_auth = create_supabase_user("rohan@sunshineclinic.com", "Test@123", "Rohan Desai")
        staff1_2_user = User(id=staff1_2_auth, tenant_id=t1.id, email="rohan@sunshineclinic.com", full_name="Rohan Desai", role="staff")

        db.add_all([doc1_1_user, doc1_2_user, staff1_1_user, staff1_2_user])
        await db.flush()  # Users must exist before FK references

        doc1_1 = Doctor(id=uid(), tenant_id=t1.id, user_id=doc1_1_auth, full_name="Dr. Priya Patel",
                        specialization="General Medicine", email="priya@sunshineclinic.com", phone="+1 555-0101", color="#2563EB")
        doc1_2 = Doctor(id=uid(), tenant_id=t1.id, user_id=doc1_2_auth, full_name="Dr. Ankit Verma",
                        specialization="Dermatology", email="ankit@sunshineclinic.com", phone="+1 555-0102", color="#7C3AED")
        db.add_all([doc1_1, doc1_2])
        print(f"  ✅ Doctors: {doc1_1.full_name}, {doc1_2.full_name}")

        staff1_1 = Staff(id=uid(), tenant_id=t1.id, user_id=staff1_1_auth, full_name="Meera Joshi", role="Receptionist",
                         email="meera@sunshineclinic.com", phone="+1 555-0103")
        staff1_2 = Staff(id=uid(), tenant_id=t1.id, user_id=staff1_2_auth, full_name="Rohan Desai", role="Nurse",
                         email="rohan@sunshineclinic.com", phone="+1 555-0104")
        db.add_all([staff1_1, staff1_2])
        print(f"  ✅ Staff: {staff1_1.full_name}, {staff1_2.full_name}")

        # Services
        svc1_1 = Service(id=uid(), tenant_id=t1.id, name="General Consultation", duration_minutes=30, price=500, color="#2563EB")
        svc1_2 = Service(id=uid(), tenant_id=t1.id, name="Skin Checkup", duration_minutes=45, price=800, color="#7C3AED")
        svc1_3 = Service(id=uid(), tenant_id=t1.id, name="Follow-up Visit", duration_minutes=15, price=300, color="#059669")
        db.add_all([svc1_1, svc1_2, svc1_3])

        # Availability (Mon-Fri 9am-5pm for both doctors)
        for doc in [doc1_1, doc1_2]:
            for day in range(0, 5):  # Mon(0) - Fri(4)
                db.add(Availability(id=uid(), tenant_id=t1.id, doctor_id=doc.id,
                                    day_of_week=day, start_time="09:00", end_time="17:00"))

        # Patients
        human_patients = []
        patient_data = [
            ("Aarav Mehta", "aarav@gmail.com", "+91 98765 00001", "Male", "A+", "1990-05-14"),
            ("Sneha Kulkarni", "sneha@gmail.com", "+91 98765 00002", "Female", "B+", "1985-08-22"),
            ("Vikram Singh", "vikram.s@gmail.com", "+91 98765 00003", "Male", "O+", "1978-12-03"),
            ("Neha Gupta", "neha.g@gmail.com", "+91 98765 00004", "Female", "AB-", "1995-01-17"),
            ("Arjun Reddy", "arjun.r@gmail.com", "+91 98765 00005", "Male", "O-", "1988-07-29"),
        ]
        for name, email, phone, gender, blood, dob in patient_data:
            p = Patient(id=uid(), tenant_id=t1.id, full_name=name, email=email, phone=phone,
                        gender=gender, blood_group=blood, date_of_birth=date.fromisoformat(dob))
            human_patients.append(p)
            db.add(p)
        print(f"  ✅ Patients: {len(human_patients)} human patients")

        # Appointments for Human Clinic
        today = date.today()
        appt_specs = [
            (human_patients[0], doc1_1, svc1_1, today, 9, 0, "scheduled"),
            (human_patients[1], doc1_1, svc1_1, today, 10, 0, "confirmed"),
            (human_patients[2], doc1_2, svc1_2, today, 11, 0, "scheduled"),
            (human_patients[3], doc1_1, svc1_3, today, 14, 0, "completed"),
            (human_patients[4], doc1_2, svc1_2, today, 15, 0, "scheduled"),
            (human_patients[0], doc1_1, svc1_1, today - timedelta(days=1), 9, 0, "completed"),
            (human_patients[1], doc1_2, svc1_2, today - timedelta(days=1), 10, 0, "completed"),
            (human_patients[2], doc1_1, svc1_3, today - timedelta(days=2), 11, 0, "cancelled"),
            (human_patients[3], doc1_2, svc1_1, today - timedelta(days=3), 14, 0, "no_show"),
            (human_patients[4], doc1_1, svc1_1, today + timedelta(days=1), 9, 0, "scheduled"),
        ]
        for pat, doc, svc, d, h, m, status in appt_specs:
            start = datetime(d.year, d.month, d.day, h, m, 0, tzinfo=timezone.utc)
            end = start + timedelta(minutes=svc.duration_minutes)
            db.add(Appointment(id=uid(), tenant_id=t1.id, doctor_id=doc.id, patient_id=pat.id,
                               service_id=svc.id, start_time=start, end_time=end, status=status))
        print(f"  ✅ Appointments: {len(appt_specs)} appointments")

        # ════════════════════════════════════════════════════════════
        # CLINIC 2: Pet Clinic
        # ════════════════════════════════════════════════════════════
        t2 = Tenant(
            id=uid(), name="PawCare Veterinary", type="pet_clinic",
            email="info@pawcarevet.com", phone="+1 555-0200",
            address="456 Pet Avenue", city="Bangalore", state="Karnataka",
            country="India", postal_code="560001", timezone="Asia/Kolkata",
            theme_color="#059669",
            description="Full-service veterinary clinic",
        )
        db.add(t2)
        await db.flush()
        print(f"\n  ✅ Tenant: {t2.name} (id={t2.id})")

        # Admin
        admin2_id = create_supabase_user("admin@pawcarevet.com", "Test@123", "Dr. Kavitha Nair")
        admin2 = User(id=admin2_id, tenant_id=t2.id, email="admin@pawcarevet.com", full_name="Dr. Kavitha Nair", role="admin")
        db.add(admin2)
        print(f"  ✅ Admin: {admin2.full_name}")

        # Doctors & Staff - create users first, flush, then create doctor/staff records
        doc2_1_auth = create_supabase_user("sanjay@pawcarevet.com", "Test@123", "Dr. Sanjay Rao")
        doc2_1_user = User(id=doc2_1_auth, tenant_id=t2.id, email="sanjay@pawcarevet.com", full_name="Dr. Sanjay Rao", role="doctor")
        doc2_2_auth = create_supabase_user("divya@pawcarevet.com", "Test@123", "Dr. Divya Iyer")
        doc2_2_user = User(id=doc2_2_auth, tenant_id=t2.id, email="divya@pawcarevet.com", full_name="Dr. Divya Iyer", role="doctor")

        staff2_1_auth = create_supabase_user("pooja@pawcarevet.com", "Test@123", "Pooja Menon")
        staff2_1_user = User(id=staff2_1_auth, tenant_id=t2.id, email="pooja@pawcarevet.com", full_name="Pooja Menon", role="staff")
        staff2_2_auth = create_supabase_user("kiran@pawcarevet.com", "Test@123", "Kiran Kumar")
        staff2_2_user = User(id=staff2_2_auth, tenant_id=t2.id, email="kiran@pawcarevet.com", full_name="Kiran Kumar", role="staff")

        db.add_all([doc2_1_user, doc2_2_user, staff2_1_user, staff2_2_user])
        await db.flush()  # Users must exist before FK references

        doc2_1 = Doctor(id=uid(), tenant_id=t2.id, user_id=doc2_1_auth, full_name="Dr. Sanjay Rao",
                        specialization="Small Animals", email="sanjay@pawcarevet.com", phone="+1 555-0201", color="#059669")
        doc2_2 = Doctor(id=uid(), tenant_id=t2.id, user_id=doc2_2_auth, full_name="Dr. Divya Iyer",
                        specialization="Surgery", email="divya@pawcarevet.com", phone="+1 555-0202", color="#EC4899")
        db.add_all([doc2_1, doc2_2])
        print(f"  ✅ Doctors: {doc2_1.full_name}, {doc2_2.full_name}")

        staff2_1 = Staff(id=uid(), tenant_id=t2.id, user_id=staff2_1_auth, full_name="Pooja Menon", role="Receptionist",
                         email="pooja@pawcarevet.com", phone="+1 555-0203")
        staff2_2 = Staff(id=uid(), tenant_id=t2.id, user_id=staff2_2_auth, full_name="Kiran Kumar", role="Vet Technician",
                         email="kiran@pawcarevet.com", phone="+1 555-0204")
        db.add_all([staff2_2_user, staff2_2])
        print(f"  ✅ Staff: {staff2_1.full_name}, {staff2_2.full_name}")

        # Services
        svc2_1 = Service(id=uid(), tenant_id=t2.id, name="Wellness Checkup", duration_minutes=30, price=600, color="#059669")
        svc2_2 = Service(id=uid(), tenant_id=t2.id, name="Vaccination", duration_minutes=15, price=400, color="#F59E0B")
        svc2_3 = Service(id=uid(), tenant_id=t2.id, name="Surgery Consultation", duration_minutes=45, price=1200, color="#EC4899")
        db.add_all([svc2_1, svc2_2, svc2_3])

        # Availability
        for doc in [doc2_1, doc2_2]:
            for day in range(0, 6):  # Mon-Sat
                db.add(Availability(id=uid(), tenant_id=t2.id, doctor_id=doc.id,
                                    day_of_week=day, start_time="09:00", end_time="18:00"))

        # Pet owners (patients)
        pet_owners = []
        owner_data = [
            ("Amit Bhatt", "amit.b@gmail.com", "+91 98765 10001", "Male"),
            ("Ritu Saxena", "ritu.s@gmail.com", "+91 98765 10002", "Female"),
            ("Deepak Jain", "deepak.j@gmail.com", "+91 98765 10003", "Male"),
            ("Swati Pillai", "swati.p@gmail.com", "+91 98765 10004", "Female"),
            ("Rajesh Mishra", "rajesh.m@gmail.com", "+91 98765 10005", "Male"),
        ]
        for name, email, phone, gender in owner_data:
            p = Patient(id=uid(), tenant_id=t2.id, full_name=name, email=email, phone=phone, gender=gender)
            pet_owners.append(p)
            db.add(p)
        print(f"  ✅ Pet Owners: {len(pet_owners)} owners")

        # Pets
        pets = []
        pet_data = [
            (pet_owners[0], "Bruno", "Dog", "Golden Retriever", "Male", 28.5, "2021-03-10"),
            (pet_owners[1], "Whiskers", "Cat", "Persian", "Female", 4.2, "2020-06-15"),
            (pet_owners[2], "Rocky", "Dog", "German Shepherd", "Male", 35.0, "2019-11-20"),
            (pet_owners[3], "Luna", "Cat", "Siamese", "Female", 3.8, "2022-01-08"),
            (pet_owners[4], "Coco", "Dog", "Labrador", "Female", 25.0, "2020-09-25"),
        ]
        for owner, name, species, breed, gender, weight, dob in pet_data:
            pet = Pet(id=uid(), tenant_id=t2.id, owner_id=owner.id, name=name,
                      species=species, breed=breed, gender=gender, weight=weight,
                      date_of_birth=date.fromisoformat(dob), vaccination_status="Up to date")
            pets.append(pet)
            db.add(pet)
        print(f"  ✅ Pets: {len(pets)} pets")

        # Appointments for Pet Clinic (with pet_id)
        pet_appt_specs = [
            (pet_owners[0], pets[0], doc2_1, svc2_1, today, 9, 0, "scheduled"),
            (pet_owners[1], pets[1], doc2_1, svc2_2, today, 10, 0, "confirmed"),
            (pet_owners[2], pets[2], doc2_2, svc2_3, today, 11, 0, "scheduled"),
            (pet_owners[3], pets[3], doc2_1, svc2_1, today, 14, 0, "completed"),
            (pet_owners[4], pets[4], doc2_2, svc2_2, today, 15, 0, "scheduled"),
            (pet_owners[0], pets[0], doc2_1, svc2_2, today - timedelta(days=1), 9, 0, "completed"),
            (pet_owners[1], pets[1], doc2_2, svc2_1, today - timedelta(days=1), 10, 0, "completed"),
            (pet_owners[2], pets[2], doc2_1, svc2_1, today - timedelta(days=2), 11, 0, "no_show"),
            (pet_owners[3], pets[3], doc2_2, svc2_3, today - timedelta(days=3), 14, 0, "cancelled"),
            (pet_owners[4], pets[4], doc2_1, svc2_1, today + timedelta(days=1), 9, 0, "scheduled"),
        ]
        for owner, pet, doc, svc, d, h, m, status in pet_appt_specs:
            start = datetime(d.year, d.month, d.day, h, m, 0, tzinfo=timezone.utc)
            end = start + timedelta(minutes=svc.duration_minutes)
            db.add(Appointment(id=uid(), tenant_id=t2.id, doctor_id=doc.id, patient_id=owner.id,
                               pet_id=pet.id, service_id=svc.id, start_time=start, end_time=end, status=status))
        print(f"  ✅ Appointments: {len(pet_appt_specs)} pet appointments")

        await db.commit()
        print("\n✨ Seed complete!")
        print("\n📋 Login credentials (all passwords: Test@123):")
        print("─" * 50)
        print("HUMAN CLINIC (Sunshine Family Clinic):")
        print("  Admin:  admin@sunshineclinic.com")
        print("  Doctor: priya@sunshineclinic.com")
        print("  Doctor: ankit@sunshineclinic.com")
        print("  Staff:  meera@sunshineclinic.com")
        print("  Staff:  rohan@sunshineclinic.com")
        print()
        print("PET CLINIC (PawCare Veterinary):")
        print("  Admin:  admin@pawcarevet.com")
        print("  Doctor: sanjay@pawcarevet.com")
        print("  Doctor: divya@pawcarevet.com")
        print("  Staff:  pooja@pawcarevet.com")
        print("  Staff:  kiran@pawcarevet.com")


if __name__ == "__main__":
    asyncio.run(seed())

"""
Seed script: adds medical records, vaccinations, prescriptions, and reports
to existing pet clinic data. Run AFTER seed.py.

Usage:
    cd backend
    python seed_pet_data.py
"""

import asyncio
import uuid
from datetime import date, timedelta

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.config import settings
from app.models import Tenant, Pet, Doctor, Patient, MedicalRecord, Prescription, Report

engine = create_async_engine(
    settings.ASYNC_DATABASE_URL,
    connect_args={"statement_cache_size": 0},
)
SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def uid():
    return str(uuid.uuid4())


async def seed_pet_clinical_data():
    async with SessionLocal() as db:
        # Find the pet clinic
        result = await db.execute(
            select(Tenant).where(Tenant.type == "pet_clinic", Tenant.name == "PawCare Veterinary")
        )
        tenant = result.scalar_one_or_none()
        if not tenant:
            print("❌ Pet clinic not found. Run seed.py first.")
            return

        t_id = tenant.id
        print(f"🐾 Adding clinical data to: {tenant.name} (id={t_id})")

        # Get all pets with owners
        pets_result = await db.execute(
            select(Pet).where(Pet.tenant_id == t_id).order_by(Pet.created_at)
        )
        pets = pets_result.scalars().all()
        if not pets:
            print("❌ No pets found. Run seed.py first.")
            return

        # Get doctors
        docs_result = await db.execute(
            select(Doctor).where(Doctor.tenant_id == t_id)
        )
        doctors = docs_result.scalars().all()
        doc1, doc2 = doctors[0], doctors[1]

        today = date.today()

        # ══════════════════════════════════════════════
        # PET 1: Bruno (Golden Retriever, Dog)
        # ══════════════════════════════════════════════
        bruno = pets[0]
        print(f"\n  🐕 {bruno.name} ({bruno.species} - {bruno.breed})")

        # Medical Records
        db.add_all([
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=bruno.owner_id, pet_id=bruno.id,
                          doctor_id=doc1.id, record_type="consultation", title="Annual Wellness Exam",
                          diagnosis="Healthy, slight tartar buildup on teeth",
                          treatment="Dental cleaning recommended in 3 months",
                          description="Weight stable at 28.5kg. Coat and skin in good condition. Heart and lungs clear.",
                          vitals={"weight": "28.5 kg", "temp": "38.5°C", "heart_rate": "80 bpm"},
                          record_date=today - timedelta(days=30)),
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=bruno.owner_id, pet_id=bruno.id,
                          doctor_id=doc1.id, record_type="diagnosis", title="Ear Infection - Left Ear",
                          diagnosis="Otitis externa, bacterial infection",
                          treatment="Ear drops (Otomax) twice daily for 10 days. Follow-up in 2 weeks.",
                          description="Owner noticed scratching and head shaking. Redness and discharge in left ear canal.",
                          vitals={"weight": "28.3 kg", "temp": "38.7°C"},
                          record_date=today - timedelta(days=60)),
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=bruno.owner_id, pet_id=bruno.id,
                          doctor_id=doc2.id, record_type="procedure", title="Dental Cleaning",
                          diagnosis="Moderate tartar, no extractions needed",
                          treatment="Ultrasonic scaling and polishing under sedation",
                          description="Full dental cleaning performed. All teeth intact. Recommended annual cleaning.",
                          record_date=today - timedelta(days=90)),
        ])

        # Vaccinations
        db.add_all([
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=bruno.owner_id, pet_id=bruno.id,
                          doctor_id=doc1.id, record_type="vaccination", title="Rabies Vaccine",
                          treatment="Nobivac Rabies - Batch #RB2024-456",
                          description="Next due: " + (today + timedelta(days=335)).isoformat(),
                          record_date=today - timedelta(days=30)),
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=bruno.owner_id, pet_id=bruno.id,
                          doctor_id=doc1.id, record_type="vaccination", title="DHPP Vaccine",
                          treatment="Canine Distemper/Parvo combo - Batch #DP2024-789",
                          description="Booster due in 1 year. No adverse reactions observed.",
                          record_date=today - timedelta(days=30)),
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=bruno.owner_id, pet_id=bruno.id,
                          doctor_id=doc1.id, record_type="vaccination", title="Bordetella (Kennel Cough)",
                          treatment="Intranasal Bordetella vaccine - Batch #KC2024-123",
                          description="Recommended for dogs visiting daycare/boarding.",
                          record_date=today - timedelta(days=180)),
        ])

        # Prescriptions
        db.add_all([
            Prescription(id=uid(), tenant_id=t_id, patient_id=bruno.owner_id, pet_id=bruno.id,
                         doctor_id=doc1.id,
                         medications=[
                             {"name": "Otomax Ear Drops", "dosage": "5 drops", "frequency": "Twice daily", "duration": "10 days"},
                         ],
                         notes="Apply to left ear only. Clean ear gently before application.",
                         prescribed_date=today - timedelta(days=60), is_active=False),
            Prescription(id=uid(), tenant_id=t_id, patient_id=bruno.owner_id, pet_id=bruno.id,
                         doctor_id=doc1.id,
                         medications=[
                             {"name": "Nexgard (Flea & Tick)", "dosage": "68mg", "frequency": "Monthly", "duration": "12 months"},
                             {"name": "Heartgard Plus", "dosage": "68-136mcg", "frequency": "Monthly", "duration": "12 months"},
                         ],
                         notes="Preventive medications. Administer with food on the 1st of each month.",
                         prescribed_date=today - timedelta(days=30), is_active=True),
        ])

        # Reports
        db.add_all([
            Report(id=uid(), tenant_id=t_id, patient_id=bruno.owner_id, pet_id=bruno.id,
                   doctor_id=doc1.id, report_type="lab_result", title="Complete Blood Count (CBC)",
                   description="All values within normal range. WBC: 10.2, RBC: 7.1, Platelets: 310",
                   report_date=today - timedelta(days=30)),
            Report(id=uid(), tenant_id=t_id, patient_id=bruno.owner_id, pet_id=bruno.id,
                   doctor_id=doc1.id, report_type="imaging", title="Dental X-Ray",
                   description="Pre-dental cleaning radiographs. No root pathology detected.",
                   report_date=today - timedelta(days=90)),
        ])
        print(f"    ✅ 3 medical records, 3 vaccinations, 2 prescriptions, 2 reports")

        # ══════════════════════════════════════════════
        # PET 2: Whiskers (Persian Cat)
        # ══════════════════════════════════════════════
        whiskers = pets[1]
        print(f"\n  🐱 {whiskers.name} ({whiskers.species} - {whiskers.breed})")

        db.add_all([
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=whiskers.owner_id, pet_id=whiskers.id,
                          doctor_id=doc1.id, record_type="consultation", title="Annual Checkup",
                          diagnosis="Healthy. Mild dental tartar. Persian-typical eye discharge.",
                          treatment="Daily eye cleaning with warm saline. Monitor teeth.",
                          description="Weight 4.2kg stable. Indoor cat, good body condition score 5/9.",
                          vitals={"weight": "4.2 kg", "temp": "38.3°C", "heart_rate": "160 bpm"},
                          record_date=today - timedelta(days=20)),
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=whiskers.owner_id, pet_id=whiskers.id,
                          doctor_id=doc2.id, record_type="procedure", title="Spay Surgery",
                          diagnosis="Routine ovariohysterectomy",
                          treatment="Surgery completed successfully. Sutures dissolving, no cone needed.",
                          description="Pre-op bloodwork normal. Surgery uneventful. Recovery in 10-14 days.",
                          record_date=today - timedelta(days=365)),
        ])

        db.add_all([
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=whiskers.owner_id, pet_id=whiskers.id,
                          doctor_id=doc1.id, record_type="vaccination", title="FVRCP Vaccine",
                          treatment="Feline viral rhinotracheitis/calicivirus/panleukopenia - Batch #FC2024-321",
                          description="Core feline vaccine. Next booster due in 1 year.",
                          record_date=today - timedelta(days=20)),
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=whiskers.owner_id, pet_id=whiskers.id,
                          doctor_id=doc1.id, record_type="vaccination", title="Rabies Vaccine",
                          treatment="Purevax Rabies - Batch #RB2024-654",
                          description="Non-adjuvanted feline rabies vaccine. Next due in 1 year.",
                          record_date=today - timedelta(days=20)),
        ])

        db.add_all([
            Prescription(id=uid(), tenant_id=t_id, patient_id=whiskers.owner_id, pet_id=whiskers.id,
                         doctor_id=doc1.id,
                         medications=[
                             {"name": "Lysine Supplement", "dosage": "250mg", "frequency": "Daily", "duration": "Ongoing"},
                         ],
                         notes="For Persian breed eye health. Mix with wet food.",
                         prescribed_date=today - timedelta(days=20), is_active=True),
        ])

        db.add_all([
            Report(id=uid(), tenant_id=t_id, patient_id=whiskers.owner_id, pet_id=whiskers.id,
                   doctor_id=doc1.id, report_type="lab_result", title="Feline Blood Panel",
                   description="Kidney and liver values normal. FIV/FeLV negative.",
                   report_date=today - timedelta(days=20)),
        ])
        print(f"    ✅ 2 medical records, 2 vaccinations, 1 prescription, 1 report")

        # ══════════════════════════════════════════════
        # PET 3: Rocky (German Shepherd, Dog)
        # ══════════════════════════════════════════════
        rocky = pets[2]
        print(f"\n  🐕 {rocky.name} ({rocky.species} - {rocky.breed})")

        db.add_all([
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=rocky.owner_id, pet_id=rocky.id,
                          doctor_id=doc2.id, record_type="surgery", title="ACL Repair Surgery",
                          diagnosis="Cranial cruciate ligament tear - right hind leg",
                          treatment="TPLO surgery performed. Post-op: strict rest 8 weeks, physical therapy.",
                          description="Large breed, 5yr old, active dog. Injury during play. Surgery successful.",
                          vitals={"weight": "35.0 kg", "temp": "38.6°C"},
                          record_date=today - timedelta(days=45)),
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=rocky.owner_id, pet_id=rocky.id,
                          doctor_id=doc2.id, record_type="follow_up", title="Post-Surgery Follow-up (4 weeks)",
                          diagnosis="Healing well, incision clean",
                          treatment="Continue restricted activity for 4 more weeks. Start gentle physio exercises.",
                          description="X-ray shows good bone plate positioning. No signs of infection.",
                          record_date=today - timedelta(days=14)),
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=rocky.owner_id, pet_id=rocky.id,
                          doctor_id=doc1.id, record_type="consultation", title="Hip Dysplasia Screening",
                          diagnosis="Mild bilateral hip dysplasia, OFA grade 'mild'",
                          treatment="Joint supplement, weight management, moderate exercise",
                          description="Breed predisposition noted. Monitor annually. No surgery needed at this stage.",
                          vitals={"weight": "35.0 kg", "temp": "38.5°C"},
                          record_date=today - timedelta(days=120)),
        ])

        db.add_all([
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=rocky.owner_id, pet_id=rocky.id,
                          doctor_id=doc1.id, record_type="vaccination", title="Rabies Vaccine",
                          treatment="Nobivac Rabies 3-Year - Batch #RB2024-111",
                          description="3-year rabies vaccine. Next due: " + (today + timedelta(days=730)).isoformat(),
                          record_date=today - timedelta(days=120)),
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=rocky.owner_id, pet_id=rocky.id,
                          doctor_id=doc1.id, record_type="vaccination", title="Leptospirosis Vaccine",
                          treatment="Nobivac Lepto4 - Batch #LP2024-222",
                          description="Annual booster. Important for outdoor/active dogs.",
                          record_date=today - timedelta(days=120)),
        ])

        db.add_all([
            Prescription(id=uid(), tenant_id=t_id, patient_id=rocky.owner_id, pet_id=rocky.id,
                         doctor_id=doc2.id,
                         medications=[
                             {"name": "Carprofen (Rimadyl)", "dosage": "75mg", "frequency": "Twice daily", "duration": "4 weeks"},
                             {"name": "Tramadol", "dosage": "50mg", "frequency": "As needed for pain", "duration": "2 weeks"},
                         ],
                         notes="Post-TPLO surgery pain management. Monitor for GI upset.",
                         prescribed_date=today - timedelta(days=45), is_active=False),
            Prescription(id=uid(), tenant_id=t_id, patient_id=rocky.owner_id, pet_id=rocky.id,
                         doctor_id=doc1.id,
                         medications=[
                             {"name": "Cosequin DS Plus MSM", "dosage": "1 tablet", "frequency": "Daily", "duration": "Ongoing"},
                             {"name": "Omega-3 Fish Oil", "dosage": "2000mg", "frequency": "Daily", "duration": "Ongoing"},
                         ],
                         notes="Long-term joint support for hip dysplasia and post-surgery recovery.",
                         prescribed_date=today - timedelta(days=14), is_active=True),
        ])

        db.add_all([
            Report(id=uid(), tenant_id=t_id, patient_id=rocky.owner_id, pet_id=rocky.id,
                   doctor_id=doc2.id, report_type="imaging", title="Right Stifle X-Ray (Pre-op)",
                   description="Confirms CCL rupture. Tibial plateau angle measured for TPLO planning.",
                   report_date=today - timedelta(days=46)),
            Report(id=uid(), tenant_id=t_id, patient_id=rocky.owner_id, pet_id=rocky.id,
                   doctor_id=doc2.id, report_type="imaging", title="Post-op X-Ray (4 weeks)",
                   description="Bone plate and screws in good position. Early callus formation. Healing on track.",
                   report_date=today - timedelta(days=14)),
            Report(id=uid(), tenant_id=t_id, patient_id=rocky.owner_id, pet_id=rocky.id,
                   doctor_id=doc1.id, report_type="imaging", title="Hip X-Ray (OFA Screening)",
                   description="Bilateral mild hip dysplasia. Femoral head coverage adequate. No DJD changes.",
                   report_date=today - timedelta(days=120)),
        ])
        print(f"    ✅ 3 medical records, 2 vaccinations, 2 prescriptions, 3 reports")

        # ══════════════════════════════════════════════
        # PET 4: Luna (Siamese Cat)
        # ══════════════════════════════════════════════
        luna = pets[3]
        print(f"\n  🐱 {luna.name} ({luna.species} - {luna.breed})")

        db.add_all([
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=luna.owner_id, pet_id=luna.id,
                          doctor_id=doc1.id, record_type="consultation", title="First Visit & Wellness Exam",
                          diagnosis="Healthy kitten, age-appropriate development",
                          treatment="Deworming initiated. Vaccination schedule started.",
                          description="New patient. Indoor Siamese, 2yr old. Alert, well-socialized. BCS 5/9.",
                          vitals={"weight": "3.8 kg", "temp": "38.4°C", "heart_rate": "180 bpm"},
                          record_date=today - timedelta(days=15)),
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=luna.owner_id, pet_id=luna.id,
                          doctor_id=doc1.id, record_type="diagnosis", title="Upper Respiratory Infection",
                          diagnosis="Mild URI, likely feline herpesvirus",
                          treatment="Supportive care: steam therapy, lysine supplement, monitor for 5 days",
                          description="Sneezing and mild eye discharge. Eating and drinking normally. No fever.",
                          vitals={"weight": "3.7 kg", "temp": "38.8°C"},
                          record_date=today - timedelta(days=75)),
        ])

        db.add_all([
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=luna.owner_id, pet_id=luna.id,
                          doctor_id=doc1.id, record_type="vaccination", title="FVRCP Vaccine",
                          treatment="Felocell 3 - Batch #FC2024-555",
                          description="First adult booster. Next due in 1 year.",
                          record_date=today - timedelta(days=15)),
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=luna.owner_id, pet_id=luna.id,
                          doctor_id=doc1.id, record_type="vaccination", title="Rabies Vaccine",
                          treatment="Purevax Rabies - Batch #RB2024-666",
                          description="Non-adjuvanted. Next due in 1 year.",
                          record_date=today - timedelta(days=15)),
        ])

        db.add_all([
            Prescription(id=uid(), tenant_id=t_id, patient_id=luna.owner_id, pet_id=luna.id,
                         doctor_id=doc1.id,
                         medications=[
                             {"name": "Revolution Plus (Flea/Tick/Worm)", "dosage": "0.5ml", "frequency": "Monthly", "duration": "12 months"},
                         ],
                         notes="Topical application. Apply between shoulder blades.",
                         prescribed_date=today - timedelta(days=15), is_active=True),
        ])

        db.add_all([
            Report(id=uid(), tenant_id=t_id, patient_id=luna.owner_id, pet_id=luna.id,
                   doctor_id=doc1.id, report_type="lab_result", title="Kitten Blood Panel + FIV/FeLV",
                   description="All values normal for age. FIV negative. FeLV negative.",
                   report_date=today - timedelta(days=15)),
        ])
        print(f"    ✅ 2 medical records, 2 vaccinations, 1 prescription, 1 report")

        # ══════════════════════════════════════════════
        # PET 5: Coco (Labrador, Dog)
        # ══════════════════════════════════════════════
        coco = pets[4]
        print(f"\n  🐕 {coco.name} ({coco.species} - {coco.breed})")

        db.add_all([
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=coco.owner_id, pet_id=coco.id,
                          doctor_id=doc1.id, record_type="consultation", title="Weight Management Consultation",
                          diagnosis="Overweight - BCS 7/9. Target weight: 22kg.",
                          treatment="Prescription diet (Hill's Metabolic). Increase exercise to 45min/day.",
                          description="Lab, 4yr old. Weight gain over past year. Thyroid screen normal.",
                          vitals={"weight": "25.0 kg", "temp": "38.5°C", "heart_rate": "90 bpm"},
                          record_date=today - timedelta(days=10)),
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=coco.owner_id, pet_id=coco.id,
                          doctor_id=doc2.id, record_type="procedure", title="Lump Removal - Right Shoulder",
                          diagnosis="Lipoma (benign fatty tumor), 3cm diameter",
                          treatment="Surgical excision under general anesthesia. Clean margins confirmed.",
                          description="Owner noticed growing lump 2 months ago. Fine needle aspirate confirmed lipoma.",
                          record_date=today - timedelta(days=150)),
        ])

        db.add_all([
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=coco.owner_id, pet_id=coco.id,
                          doctor_id=doc1.id, record_type="vaccination", title="DHPP Vaccine",
                          treatment="Vanguard Plus 5 - Batch #DP2024-333",
                          description="Annual booster. No adverse reactions.",
                          record_date=today - timedelta(days=60)),
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=coco.owner_id, pet_id=coco.id,
                          doctor_id=doc1.id, record_type="vaccination", title="Rabies Vaccine",
                          treatment="Nobivac Rabies - Batch #RB2024-444",
                          description="Annual rabies. Next due in 1 year.",
                          record_date=today - timedelta(days=60)),
            MedicalRecord(id=uid(), tenant_id=t_id, patient_id=coco.owner_id, pet_id=coco.id,
                          doctor_id=doc1.id, record_type="vaccination", title="Leptospirosis Vaccine",
                          treatment="Nobivac Lepto4 - Batch #LP2024-555",
                          description="Annual booster for outdoor exposure.",
                          record_date=today - timedelta(days=60)),
        ])

        db.add_all([
            Prescription(id=uid(), tenant_id=t_id, patient_id=coco.owner_id, pet_id=coco.id,
                         doctor_id=doc1.id,
                         medications=[
                             {"name": "Hill's Prescription Diet Metabolic", "dosage": "2 cups/day", "frequency": "Split into 2 meals", "duration": "3 months"},
                         ],
                         notes="Weight loss diet. No treats except raw carrots/green beans. Reweigh in 6 weeks.",
                         prescribed_date=today - timedelta(days=10), is_active=True),
            Prescription(id=uid(), tenant_id=t_id, patient_id=coco.owner_id, pet_id=coco.id,
                         doctor_id=doc1.id,
                         medications=[
                             {"name": "Simparica Trio", "dosage": "24mg", "frequency": "Monthly", "duration": "12 months"},
                         ],
                         notes="Combined flea, tick, heartworm prevention. Give with food.",
                         prescribed_date=today - timedelta(days=60), is_active=True),
        ])

        db.add_all([
            Report(id=uid(), tenant_id=t_id, patient_id=coco.owner_id, pet_id=coco.id,
                   doctor_id=doc1.id, report_type="lab_result", title="Thyroid Panel + CBC",
                   description="T4: 2.1 (normal). CBC normal. Lipid panel shows mildly elevated cholesterol.",
                   report_date=today - timedelta(days=10)),
            Report(id=uid(), tenant_id=t_id, patient_id=coco.owner_id, pet_id=coco.id,
                   doctor_id=doc2.id, report_type="pathology", title="Lipoma Histopathology",
                   description="Benign lipoma. Complete excision with clean margins. No further treatment needed.",
                   report_date=today - timedelta(days=145)),
        ])
        print(f"    ✅ 2 medical records, 3 vaccinations, 2 prescriptions, 2 reports")

        # Update pet addresses on owners for completeness
        owners_result = await db.execute(
            select(Patient).where(Patient.tenant_id == t_id)
        )
        owners = owners_result.scalars().all()
        addresses = [
            "42 Palm Grove, Koramangala, Bangalore",
            "15 MG Road, Indiranagar, Bangalore",
            "78 HSR Layout, Sector 2, Bangalore",
            "201 Whitefield Main, Bangalore",
            "9 Jayanagar 4th Block, Bangalore",
        ]
        for i, owner in enumerate(owners):
            if i < len(addresses):
                owner.address = addresses[i]

        await db.commit()

        print(f"\n✨ Pet clinical data seeded successfully!")
        print(f"   Total: {5} pets with medical records, vaccinations, prescriptions & reports")


if __name__ == "__main__":
    asyncio.run(seed_pet_clinical_data())

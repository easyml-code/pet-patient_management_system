import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer';
import { format, parseISO, differenceInYears } from 'date-fns';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1e293b' },
  headerBand: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#2563EB', paddingBottom: 12, marginBottom: 12 },
  logo: { width: 50, height: 50, borderRadius: 6, marginRight: 12 },
  clinicInfo: { flex: 1 },
  clinicName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1e293b' },
  clinicTagline: { fontSize: 9, color: '#64748b', marginTop: 2 },
  clinicContact: { fontSize: 8, color: '#64748b', marginTop: 4 },
  doctorBar: { backgroundColor: '#f1f5f9', borderRadius: 4, padding: 8, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between' },
  doctorName: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  doctorDetail: { fontSize: 8, color: '#64748b' },
  patientRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  patientLabel: { fontSize: 8, color: '#94a3b8', textTransform: 'uppercase' },
  patientValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginTop: 1 },
  rxSymbol: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#2563EB', marginBottom: 6 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#334155', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  medTable: { borderWidth: 0.5, borderColor: '#e2e8f0', borderRadius: 4, marginBottom: 10 },
  medHeaderRow: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', paddingVertical: 5, paddingHorizontal: 6 },
  medRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9', paddingVertical: 5, paddingHorizontal: 6 },
  medCol1: { width: '5%', fontSize: 9 },
  medCol2: { width: '25%', fontSize: 9 },
  medCol3: { width: '15%', fontSize: 9 },
  medCol4: { width: '20%', fontSize: 9 },
  medCol5: { width: '15%', fontSize: 9 },
  medCol6: { width: '20%', fontSize: 9 },
  medHeader: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#64748b', textTransform: 'uppercase' },
  freeText: { fontSize: 10, lineHeight: 1.6, color: '#334155', padding: 8, backgroundColor: '#fafafa', borderRadius: 4, borderWidth: 0.5, borderColor: '#e2e8f0' },
  adviceBox: { backgroundColor: '#f0fdf4', borderRadius: 4, padding: 8, marginBottom: 6 },
  adviceText: { fontSize: 9, color: '#166534', lineHeight: 1.5 },
  labBox: { backgroundColor: '#eff6ff', borderRadius: 4, padding: 8, marginBottom: 6 },
  labText: { fontSize: 9, color: '#1e40af', lineHeight: 1.5 },
  followUpBox: { backgroundColor: '#fefce8', borderRadius: 4, padding: 8, marginBottom: 6 },
  followUpText: { fontSize: 9, color: '#854d0e', lineHeight: 1.5 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTopWidth: 0.5, borderTopColor: '#e2e8f0', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: '#94a3b8' },
});

function getAge(dob) {
  if (!dob) return null;
  try {
    const d = typeof dob === 'string' ? parseISO(dob) : dob;
    const years = differenceInYears(new Date(), d);
    return years > 0 ? `${years} yrs` : '< 1 yr';
  } catch { return null; }
}

export default function PrescriptionPDF({ prescription, tenant, doctor, patient, pet }) {
  const rx = prescription;
  const config = tenant?.settings?.prescription_config || {};
  const showLogo = config.show_logo !== false && tenant?.logo_url;
  const tagline = config.tagline || tenant?.description || '';
  const footerText = config.footer_text || '';

  const patientName = pet ? pet.name : patient?.full_name || 'N/A';
  const patientDob = pet ? pet.date_of_birth : patient?.date_of_birth;
  const patientGender = pet ? pet.gender : patient?.gender;
  const ownerName = pet ? (pet.owner?.full_name || patient?.full_name) : null;

  const prescribedDate = rx.prescribed_date
    ? format(typeof rx.prescribed_date === 'string' ? parseISO(rx.prescribed_date) : rx.prescribed_date, 'dd MMM yyyy')
    : format(new Date(), 'dd MMM yyyy');

  const addressParts = [tenant?.address, tenant?.city, tenant?.state, tenant?.postal_code, tenant?.country].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerBand}>
          {showLogo && <Image src={tenant.logo_url} style={styles.logo} />}
          <View style={styles.clinicInfo}>
            <Text style={styles.clinicName}>{tenant?.name || 'Clinic'}</Text>
            {tagline && <Text style={styles.clinicTagline}>{tagline}</Text>}
            <Text style={styles.clinicContact}>
              {[tenant?.phone, tenant?.email, tenant?.website_url].filter(Boolean).join('  |  ')}
            </Text>
          </View>
        </View>

        {/* Doctor Info */}
        <View style={styles.doctorBar}>
          <View>
            <Text style={styles.doctorName}>Dr. {doctor?.full_name || 'N/A'}</Text>
            <Text style={styles.doctorDetail}>
              {[doctor?.qualification, doctor?.specialization].filter(Boolean).join('  |  ')}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {doctor?.registration_number && (
              <Text style={styles.doctorDetail}>Reg. No: {doctor.registration_number}</Text>
            )}
            {doctor?.license_number && (
              <Text style={styles.doctorDetail}>License: {doctor.license_number}</Text>
            )}
          </View>
        </View>

        {/* Patient Info */}
        <View style={styles.patientRow}>
          <View>
            <Text style={styles.patientLabel}>{pet ? 'Patient (Pet)' : 'Patient'}</Text>
            <Text style={styles.patientValue}>{patientName}</Text>
            {pet && <Text style={{ fontSize: 8, color: '#64748b', marginTop: 1 }}>{[pet.species, pet.breed].filter(Boolean).join(' - ')}</Text>}
          </View>
          {ownerName && (
            <View>
              <Text style={styles.patientLabel}>Owner</Text>
              <Text style={styles.patientValue}>{ownerName}</Text>
            </View>
          )}
          <View>
            <Text style={styles.patientLabel}>Age</Text>
            <Text style={styles.patientValue}>{getAge(patientDob) || 'N/A'}</Text>
          </View>
          <View>
            <Text style={styles.patientLabel}>Gender</Text>
            <Text style={{ ...styles.patientValue, textTransform: 'capitalize' }}>{patientGender || 'N/A'}</Text>
          </View>
          <View>
            <Text style={styles.patientLabel}>Date</Text>
            <Text style={styles.patientValue}>{prescribedDate}</Text>
          </View>
        </View>

        {/* Chief Complaint */}
        {rx.chief_complaint && (
          <View>
            <Text style={styles.sectionTitle}>Chief Complaint</Text>
            <Text style={{ fontSize: 10, color: '#334155', lineHeight: 1.5 }}>{rx.chief_complaint}</Text>
          </View>
        )}

        {/* Diagnosis */}
        {rx.diagnosis && (
          <View>
            <Text style={styles.sectionTitle}>Diagnosis</Text>
            <Text style={{ fontSize: 10, color: '#334155', lineHeight: 1.5 }}>{rx.diagnosis}</Text>
          </View>
        )}

        {/* Rx - Prescription */}
        <Text style={{ ...styles.rxSymbol, marginTop: 14 }}>Rx</Text>

        {rx.prescription_mode === 'freetext' && rx.free_text_prescription ? (
          <View style={styles.freeText}>
            <Text>{rx.free_text_prescription}</Text>
          </View>
        ) : rx.medications && rx.medications.length > 0 ? (
          <View style={styles.medTable}>
            <View style={styles.medHeaderRow}>
              <Text style={{ ...styles.medCol1, ...styles.medHeader }}>#</Text>
              <Text style={{ ...styles.medCol2, ...styles.medHeader }}>Medicine</Text>
              <Text style={{ ...styles.medCol3, ...styles.medHeader }}>Dosage</Text>
              <Text style={{ ...styles.medCol4, ...styles.medHeader }}>Frequency</Text>
              <Text style={{ ...styles.medCol5, ...styles.medHeader }}>Duration</Text>
              <Text style={{ ...styles.medCol6, ...styles.medHeader }}>Instructions</Text>
            </View>
            {rx.medications.map((m, i) => (
              <View key={i} style={styles.medRow}>
                <Text style={styles.medCol1}>{i + 1}</Text>
                <Text style={{ ...styles.medCol2, fontFamily: 'Helvetica-Bold' }}>{m.name || ''}</Text>
                <Text style={styles.medCol3}>{m.dosage || ''}</Text>
                <Text style={styles.medCol4}>{m.frequency || ''}</Text>
                <Text style={styles.medCol5}>{m.duration || ''}</Text>
                <Text style={styles.medCol6}>{m.instructions || ''}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>No medications prescribed</Text>
        )}

        {rx.notes && (
          <View style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 9, color: '#64748b' }}>{rx.notes}</Text>
          </View>
        )}

        {/* Advice */}
        {rx.advice && (
          <View>
            <Text style={styles.sectionTitle}>Advice / Instructions</Text>
            <View style={styles.adviceBox}>
              <Text style={styles.adviceText}>{rx.advice}</Text>
            </View>
          </View>
        )}

        {/* Lab Advice */}
        {rx.lab_advice && (
          <View>
            <Text style={styles.sectionTitle}>Lab / Investigation Advice</Text>
            <View style={styles.labBox}>
              <Text style={styles.labText}>{rx.lab_advice}</Text>
            </View>
          </View>
        )}

        {/* Follow-up */}
        {(rx.follow_up_date || rx.follow_up_notes) && (
          <View>
            <Text style={styles.sectionTitle}>Follow-up</Text>
            <View style={styles.followUpBox}>
              <Text style={styles.followUpText}>
                {rx.follow_up_date && `Date: ${typeof rx.follow_up_date === 'string' ? rx.follow_up_date : format(rx.follow_up_date, 'dd MMM yyyy')}`}
                {rx.follow_up_date && rx.follow_up_notes && '  |  '}
                {rx.follow_up_notes}
              </Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {addressParts.join(', ')}
          </Text>
          <Text style={styles.footerText}>
            {[tenant?.phone, tenant?.email].filter(Boolean).join('  |  ')}
            {footerText ? `  |  ${footerText}` : ''}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

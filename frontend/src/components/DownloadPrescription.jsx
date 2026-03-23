import React, { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import PrescriptionPDF from './PrescriptionPDF';

export default function DownloadPrescription({ prescription, tenant, doctor, patient, pet, size = 'sm', variant = 'outline', label }) {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async (e) => {
    e?.stopPropagation?.();
    setGenerating(true);
    try {
      const blob = await pdf(
        <PrescriptionPDF
          prescription={prescription}
          tenant={tenant}
          doctor={doctor}
          patient={patient}
          pet={pet}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const patientName = pet?.name || patient?.full_name || 'patient';
      const date = prescription.prescribed_date
        ? new Date(prescription.prescribed_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      a.download = `prescription_${patientName.replace(/\s+/g, '_')}_${date}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed:', err);
    }
    setGenerating(false);
  };

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleDownload}
      disabled={generating}
      className="gap-1 text-xs"
    >
      {generating ? (
        <><Loader2 className="h-3 w-3 animate-spin" /> Generating...</>
      ) : (
        <><Download className="h-3 w-3" /> {label || 'Download Rx'}</>
      )}
    </Button>
  );
}

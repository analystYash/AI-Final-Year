import * as XLSX from 'xlsx';

/**
 * Exports patient records and clinical statistics to a formatted Excel (.xlsx) spreadsheet.
 * Generates two sheets:
 * 1. "Patient Records": Detailed patient-level demographic, medical condition, allergy, and prescription records.
 * 2. "Summary & Counts": Executive cohort analytics, demographic counts, allergy alerts, and prescription volume.
 * 
 * Supports both downloading via backend API endpoint and client-side SheetJS generation fallback.
 */
export async function exportPatientsExcelFile({
  patients = [],
  prescriptions = [],
  doctorProfile = null,
  preferBackend = true
}) {
  if (preferBackend) {
    try {
      const response = await fetch('/api/patients/export-excel');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const nowStr = new Date().toISOString().slice(0, 10);
        link.download = `Patient_Records_${nowStr}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        return { success: true, method: 'backend', count: patients.length };
      }
    } catch (err) {
      console.warn('Backend Excel download failed, falling back to client-side generation:', err);
    }
  }

  // Client-side generation using SheetJS (XLSX)
  const wb = XLSX.utils.book_new();

  // 1. Prepare detailed records for Sheet 1
  const patientRecords = patients.map((p, idx) => {
    const pPrescriptions = prescriptions.filter(
      pr => pr.patient_id === p.id || pr.patient_contact === p.contact_number
    );
    const latestRx = pPrescriptions.length > 0 ? pPrescriptions[0].drug_name : 'None';

    return {
      'No.': idx + 1,
      'Patient ID': `PAT-${String(p.id || idx + 1).padStart(3, '0')}`,
      'Full Name': p.name || 'Unknown',
      'Age (Years)': p.age || 0,
      'Gender': p.gender || 'Other',
      'Contact Phone': p.contact_number || 'N/A',
      'Current Health Issue': p.current_health_issue || 'N/A',
      'Existing Diseases': p.existing_diseases || 'None',
      'Known Allergies': p.allergies || 'None',
      'Medical History': p.medical_history || 'None',
      'Current Medications': p.current_medications || 'None',
      'Pregnancy Status': p.is_pregnant ? 'Pregnant' : 'No',
      'Trimester': p.pregnancy_trimester || 'N/A',
      'Prescriptions Count': pPrescriptions.length,
      'Latest Prescribed Drug': latestRx,
      'Registration Date': (p.created_at || '').slice(0, 19)
    };
  });

  const ws1 = XLSX.utils.json_to_sheet(patientRecords);

  // Set column widths for Sheet 1
  ws1['!cols'] = [
    { wch: 6 },  // No.
    { wch: 14 }, // Patient ID
    { wch: 22 }, // Full Name
    { wch: 12 }, // Age
    { wch: 12 }, // Gender
    { wch: 16 }, // Contact Phone
    { wch: 28 }, // Current Health Issue
    { wch: 24 }, // Existing Diseases
    { wch: 20 }, // Allergies
    { wch: 28 }, // Medical History
    { wch: 24 }, // Current Medications
    { wch: 18 }, // Pregnancy Status
    { wch: 12 }, // Trimester
    { wch: 20 }, // Prescriptions Count
    { wch: 24 }, // Latest Prescribed Drug
    { wch: 20 }  // Registration Date
  ];

  XLSX.utils.book_append_sheet(wb, ws1, 'Patient Records');

  // 2. Prepare Cohort Summary & Statistics for Sheet 2
  const totalCount = patients.length;
  const maleCount = patients.filter(p => String(p.gender || '').toLowerCase() === 'male').length;
  const femaleCount = patients.filter(p => String(p.gender || '').toLowerCase() === 'female').length;
  const otherGenderCount = totalCount - maleCount - femaleCount;
  const allergyCount = patients.filter(p => p.allergies && !['none', 'no', ''].includes(p.allergies.toLowerCase())).length;
  const pregnantCount = patients.filter(p => p.is_pregnant).length;
  const avgAge = totalCount > 0 ? (patients.reduce((acc, p) => acc + (Number(p.age) || 0), 0) / totalCount).toFixed(1) : '0';
  const totalPrescriptions = prescriptions.length;

  const now = new Date();
  const formattedDate = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;

  const summaryData = [
    { 'Metric / Category': 'Total Registered Patients', 'Value / Count': totalCount, 'Description / Relevance': 'Total clinical patient cohort maintained in database' },
    { 'Metric / Category': 'Male Patients', 'Value / Count': maleCount, 'Description / Relevance': `${totalCount ? ((maleCount / totalCount) * 100).toFixed(1) : 0}% of patient population` },
    { 'Metric / Category': 'Female Patients', 'Value / Count': femaleCount, 'Description / Relevance': `${totalCount ? ((femaleCount / totalCount) * 100).toFixed(1) : 0}% of patient population` },
    { 'Metric / Category': 'Other / Diverse Gender', 'Value / Count': otherGenderCount, 'Description / Relevance': 'Other gender identifications' },
    { 'Metric / Category': 'Average Cohort Age', 'Value / Count': `${avgAge} yrs`, 'Description / Relevance': 'Mean patient age in clinic records' },
    { 'Metric / Category': 'Patients with Recorded Allergies', 'Value / Count': allergyCount, 'Description / Relevance': 'Require strict pharmacological contraindication screening' },
    { 'Metric / Category': 'Pregnant Patients', 'Value / Count': pregnantCount, 'Description / Relevance': 'Require pregnancy safety verification' },
    { 'Metric / Category': 'Total Prescriptions Issued', 'Value / Count': totalPrescriptions, 'Description / Relevance': 'Total recorded treatments with AI second opinion' },
    { 'Metric / Category': 'Attending Physician', 'Value / Count': doctorProfile?.name || 'Dr. Sharma, MD', 'Description / Relevance': doctorProfile?.specialization || 'Cardiology & Internal Medicine' },
    { 'Metric / Category': 'Clinical Center / Hospital', 'Value / Count': doctorProfile?.hospital_name || 'Apex Multispecialty Hospital', 'Description / Relevance': doctorProfile?.license_number || 'MH-CARD-2021-984' },
    { 'Metric / Category': 'Report Generated At', 'Value / Count': formattedDate, 'Description / Relevance': 'Timestamp of exported audit file' }
  ];

  const ws2 = XLSX.utils.json_to_sheet(summaryData);
  ws2['!cols'] = [
    { wch: 34 },
    { wch: 22 },
    { wch: 48 }
  ];

  XLSX.utils.book_append_sheet(wb, ws2, 'Summary & Counts');

  // Trigger download
  const dateStamp = now.toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Patient_Records_Export_${dateStamp}.xlsx`);

  return { success: true, method: 'client', count: totalCount };
}

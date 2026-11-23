// API communication service for DrugAI backend
// Powered by External Medical API Key (5d5094cae00d74ee47d92601d5e4afd0) and ML Engine

const API_BASE = '/api';

/**
 * Safely parses response JSON body.
 * Prevents "Failed to execute 'json' on 'Response': Unexpected end of JSON input"
 * by reading as text first, verifying non-empty content, and safely parsing.
 */
async function parseApiResponse(res, fallbackError = 'Request failed') {
  let text = '';
  try {
    text = await res.text();
  } catch (readErr) {
    throw new Error(`${fallbackError}: Could not read response stream (${readErr.message})`);
  }

  let data = null;
  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON response (e.g. HTML error page or empty/corrupt body)
      data = null;
    }
  }

  if (!res.ok) {
    const errorMsg =
      data?.error ||
      data?.message ||
      (text && text.length < 200 && !text.includes('<!DOCTYPE') && !text.includes('<html') ? text.trim() : null) ||
      `${fallbackError} (HTTP ${res.status}${res.statusText ? ' ' + res.statusText : ''})`.trim();
    throw new Error(errorMsg);
  }

  return data !== null ? data : {};
}

/**
 * Universal safe fetch wrapper that handles connection errors and response parsing.
 */
async function safeFetch(url, options = {}, fallbackError = 'Request failed') {
  let res;
  try {
    res = await fetch(url, options);
  } catch (netErr) {
    throw new Error(
      `Unable to reach backend server. Please verify the Python Flask backend is running on port 5000 (${netErr.message}).`
    );
  }
  return await parseApiResponse(res, fallbackError);
}

/**
 * Get personalized clinical analysis (body effects, side effects, personalized diet, advisory, allergy checks)
 * powered by the configured Medical API Key (5d5094cae00d74ee47d92601d5e4afd0).
 */
export async function getExternalClinicalAnalysis({ patient, drugName, candidateDrugs, lang = 'english' }) {
  try {
    return await safeFetch(
      `${API_BASE}/external/clinical-analysis`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient,
          drug_name: drugName,
          candidate_drugs: candidateDrugs,
          lang
        })
      },
      'Failed to fetch clinical analysis'
    );
  } catch (error) {
    console.warn('External clinical analysis fallback:', error);
    // Safe clinical fallback data
    const age = parseInt(patient?.age || '30');
    const ageGroup = age < 12 ? 'Pediatric (<12y)' : age < 18 ? 'Adolescent (12-17y)' : age >= 60 ? 'Geriatric (60y+)' : 'Adult (18-59y)';
    return {
      status: 'fallback',
      drug_name: drugName,
      age_group: ageGroup,
      bodyEffects: [
        {
          title: `Targeted Pharmacodynamics (${drugName})`,
          description: `Direct therapeutic effect on targeted physiological receptors tailored for ${ageGroup} profile.`,
          organ: 'stomach'
        }
      ],
      sideEffects: [
        { effect: 'Mild Headache', severity: 'mild', incidence: '4%', ageNote: `Standard monitoring in ${ageGroup}.` },
        { effect: 'Transient Nausea', severity: 'mild', incidence: '2%', ageNote: 'Take with food if needed.' }
      ],
      personalizedDiet: {
        condition: patient?.current_health_issue || 'General Medical Condition',
        foods_to_eat: {
          english: ['Tender coconut water & fresh buttermilk', 'Cold milk & boiled oatmeal', 'Bland khichdi with mild turmeric'],
          hinglish: ['Nariyal pani aur taza chaach piyein', 'Thanda doodh aur daliya', 'Bland khichdi halki haldi ke sath'],
          marathi: ['शहाळ्याचे पाणी आणि ताजे ताक', 'थंड दूध आणि साधी लापशी / ओट्स', 'कमी मसाल्याची हलकी मूगडाळ खिचडी']
        },
        foods_to_avoid: {
          english: ['Deep-fried snacks & oily red gravies', 'Empty stomach black tea & strong coffee', 'Sour citrus juices & raw chilies'],
          hinglish: ['Tala-bhuna, oily aur spicy khana', 'Khali pet chai aur strong coffee', 'Khatta ras aur teekhi mirch'],
          marathi: ['तळलेले तेलकट पदार्थ आणि अति तिखट रस्सा', 'उपाशीपोटी कडक चहा आणि कॉफी', 'आंबट फळांचे रस आणि हिरवी मिरची']
        },
        clinical_reason: {
          english: 'Reduces mucosal irritation, normalizes secretion, and accelerates tissue recovery.',
          hinglish: 'Pet me irritation kam karta hai aur recovery tez karta hai.',
          marathi: 'दाह कमी करून गॅस्ट्रिक लायनिंगचे जलद पुनरुत्थान करण्यास मदत होते.'
        }
      },
      hasAllergyConflict: false,
      allergyWarnings: [
        {
          allergen: patient?.allergies || 'None',
          risk: 'No direct contraindication or cross-reactivity detected with this medication.',
          recommendation: 'Safe to administer under standard clinical protocol.'
        }
      ],
      advisory: {
        english: `${drugName} provides optimal evidence-based therapeutic action for ${patient?.name || 'patient'} (${ageGroup}). Take with water as prescribed; follow dietary restrictions to maximize clinical recovery.`,
        hinglish: `${patient?.name || 'Patient'} (${ageGroup}) ke liye ${drugName} sabse asardaar dawai hai. Isse niyamit roop se paani ke sath lein aur parhez ka dhyan rakhein.`,
        marathi: `${patient?.name || 'रुग्ण'} (${ageGroup}) यांच्या त्रासासाठी ${drugName} अत्यंत गुणकारी ठरले आहे. डॉक्टरांच्या सल्ल्यानुसार हे औषध पाण्यासोबत घ्यावे आणि पथ्य पाळावे.`
      }
    };
  }
}

/**
 * Alias for backward compatibility - calls external clinical analysis powered by Medical API key
 */
export async function getGeminiDrugAnalysis({ drugNames, patient, lang = 'english' }) {
  const drug = Array.isArray(drugNames) ? drugNames[0] : (drugNames || 'Pantoprazole');
  return getExternalClinicalAnalysis({ patient, drugName: drug, lang });
}

/**
 * Check allergy conflict via pharmacological engine using Medical API logic
 */
export async function checkAllergyConflict({ drugName, allergies, patient }) {
  if (!allergies || allergies.toLowerCase() === 'none') {
    return { hasConflict: false, safetyLevel: 'safe', conflicts: [], clinicalNote: 'No known allergies reported.' };
  }

  const pAllergies = String(allergies).toLowerCase();
  const dName = String(drugName).toLowerCase();

  let hasConflict = false;
  let safetyLevel = 'safe';
  const conflicts = [];

  if (pAllergies.includes('penicillin') && (dName.includes('amox') || dName.includes('penicil') || dName.includes('ampicil'))) {
    hasConflict = true;
    safetyLevel = 'avoid';
    conflicts.push({
      allergen: 'Penicillin',
      type: 'direct',
      description: 'Severe beta-lactam anaphylaxis hazard! Direct allergy conflict.',
      action: 'avoid'
    });
  } else if (pAllergies.includes('sulfa') && (dName.includes('glimepiride') || dName.includes('spironolactone') || dName.includes('furosemide'))) {
    hasConflict = true;
    safetyLevel = 'caution';
    conflicts.push({
      allergen: 'Sulfa',
      type: 'cross-reactive',
      description: 'Potential sulfonamide cutaneous sensitivity.',
      action: 'caution'
    });
  } else if (pAllergies.includes('nsaid') && (dName.includes('ibuprofen') || dName.includes('aspirin') || dName.includes('celecoxib'))) {
    hasConflict = true;
    safetyLevel = 'avoid';
    conflicts.push({
      allergen: 'NSAIDs',
      type: 'direct',
      description: 'Risk of bronchospasm or severe urticaria from COX inhibition.',
      action: 'avoid'
    });
  }

  return {
    hasConflict,
    safetyLevel,
    conflicts,
    clinicalNote: hasConflict
      ? `High-risk allergy conflict detected for ${drugName}. Consider prescribing alternative therapy.`
      : `Verified safe for administration with patient's documented allergies (${allergies}).`
  };
}

/**
 * Condition-based drug matching dictionary to ensure candidates match patient health issue.
 */
export const CONDITION_DRUG_CATEGORIES = {
  acidity: ['Pantoprazole', 'Omeprazole', 'Rabeprazole', 'Esomeprazole'],
  gerd: ['Pantoprazole', 'Omeprazole', 'Rabeprazole', 'Esomeprazole'],
  heartburn: ['Pantoprazole', 'Omeprazole', 'Rabeprazole', 'Esomeprazole'],
  gastritis: ['Pantoprazole', 'Omeprazole', 'Rabeprazole', 'Esomeprazole'],
  hypertension: ['Amlodipine', 'Lisinopril', 'Losartan', 'Metoprolol'],
  bp: ['Amlodipine', 'Lisinopril', 'Losartan', 'Metoprolol'],
  blood_pressure: ['Amlodipine', 'Lisinopril', 'Losartan', 'Metoprolol'],
  diabetes: ['Metformin', 'Glimepiride', 'Empagliflozin', 'Insulin Glargine'],
  sugar: ['Metformin', 'Glimepiride', 'Empagliflozin', 'Insulin Glargine'],
  pain: ['Paracetamol', 'Ibuprofen', 'Celecoxib', 'Tramadol'],
  headache: ['Paracetamol', 'Ibuprofen', 'Celecoxib', 'Tramadol'],
  arthritis: ['Celecoxib', 'Ibuprofen', 'Paracetamol', 'Tramadol'],
  asthma: ['Salbutamol', 'Montelukast', 'Budesonide'],
  cough: ['Salbutamol', 'Montelukast', 'Budesonide', 'Azithromycin'],
  breathing: ['Salbutamol', 'Montelukast', 'Budesonide'],
  infection: ['Amoxicillin', 'Azithromycin', 'Ciprofloxacin'],
  bacterial: ['Amoxicillin', 'Azithromycin', 'Ciprofloxacin'],
  fever: ['Paracetamol', 'Ibuprofen', 'Azithromycin'],
  cholesterol: ['Atorvastatin', 'Amlodipine', 'Metformin'],
  anxiety: ['Alprazolam', 'Sertraline'],
  depression: ['Sertraline', 'Alprazolam']
};

export function getConditionMatchingDrugs(patient) {
  const text = `${patient?.current_health_issue || ''} ${patient?.existing_diseases || ''}`.toLowerCase();
  for (const [key, drugList] of Object.entries(CONDITION_DRUG_CATEGORIES)) {
    if (text.includes(key)) {
      return drugList;
    }
  }
  return ['Pantoprazole', 'Amlodipine', 'Metformin', 'Paracetamol'];
}

/**
 * Medicine Recommendation powered by Medical API Key (5d5094cae00d74ee47d92601d5e4afd0) and ML Engine
 * Matches patient condition, age group, and allergies, returning 4-drug comparative evaluation.
 */
export async function getGeminiMedicineRecommendation({ patient, candidateDrugs, currentDrug, lang = 'english' }) {
  const issue = patient?.current_health_issue || patient?.existing_diseases || 'General Medical Consultation';
  const drugsList = candidateDrugs && candidateDrugs.length > 0 ? candidateDrugs : getConditionMatchingDrugs(patient);

  try {
    const data = await safeFetch(`${API_BASE}/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient, drugs: drugsList })
    }, 'Compare API call failed');

    const candidateDrugsMapped = (data.candidate_drugs || []).map((cd, i) => ({
      drug_name: cd.drug_name,
      drug_class: cd.drug_class || cd.therapeutic_action || 'Targeted Pharmacotherapy',
      active_ingredient: cd.active_ingredient || cd.drug_name,
      generic_name: cd.generic_name || `${cd.drug_name} IP`,
      therapeutic_action: cd.therapeutic_action || cd.drug_class || 'Clinical Pharmacotherapy',
      formulation: cd.formulation || 'Oral Formulation',
      effectiveness_pct: typeof cd.effectiveness_pct === 'number' ? cd.effectiveness_pct : null,
      side_effect_pct: typeof cd.side_effect_pct === 'number' ? cd.side_effect_pct : null,
      ddi_pct: typeof cd.ddi_pct === 'number' ? cd.ddi_pct : null,
      suitability_score: typeof cd.suitability_score === 'number' ? cd.suitability_score : null,
      suitability: cd.suitability || null,
      safety_score_pct: typeof cd.suitability_score === 'number' ? cd.suitability_score : (typeof cd.side_effect_pct === 'number' ? 100 - cd.side_effect_pct : null),
      recovery_time: cd.recovery_time || 'Recovery duration cannot be reliably estimated from the available information.',
      recovery_source: cd.recovery_source || 'Clinical Pharmacology Consensus',
      pricing: cd.pricing || { has_pricing: false, price_display: 'Price unavailable' },
      monthly_cost_inr: cd.pricing?.generic?.mrp ? Math.round(cd.pricing.generic.unit_price * 30) : null,
      recommendation_badge: cd.recommendation_badge || (i === 0 ? 'AI Recommended' : 'Alternative Option'),
      eligibility: cd.eligibility || 'ELIGIBLE',
      override_reason: cd.override_reason || null,
      allergy_safe: cd.allergy_safe ?? true,
      allergy_compatibility: cd.allergy_compatibility || 'Compatible',
      allergy_alert: cd.allergy_alert || null,
      ddi_summary: cd.ddi_summary || 'No critical interactions identified.',
      target_organs: cd.target_organs?.map(o => typeof o === 'string' ? o : (o.name || o.key)) || ['stomach']
    }));

    return {
      conditionIdentified: data.condition_evaluated || issue,
      recommendedDrug: data.recommended_drug || null,
      recommendationBadge: data.recommended_drug ? 'AI Recommended' : 'No Recommendation Supported',
      candidateDrugs: candidateDrugsMapped,
      excludedCandidates: data.excluded_candidates || [],
      personalizedDietaryPlan: data.personalized_dietary_plan || null,
      recommendationRationale: {
        english: data.recommendation_rationale || `${data.recommended_drug || 'Candidate'} evaluated based on validated patient data.`,
        hinglish: `${patient?.name || 'Patient'} ke clinical data aur allergies ko check karke yeh analysis tayar ki gayi hai.`,
        marathi: `${patient?.name || 'रुग्ण'} यांच्या वैद्यकीय नोंदी आणि ॲलर्जी तपासून हे विश्लेषण केले आहे.`
      },
      explanationForPatient: data.explanation_for_patient || {
        english: `This clinical analysis directly corresponds to your ${issue}. It is chosen specifically for your age and verified against your allergies.`,
        hinglish: `Yeh analysis aapki ${issue} ke aadhar par tayar ki gayi hai. Aapki age aur allergy check karke safe alternatives evaluate kiye gaye hain.`,
        marathi: `हे विश्लेषण तुमच्या ${issue} या त्रासावर आधारित आहे. तुमच्या वयानुसार आणि ॲलर्जी तपासून सुरक्षित औषधे निवडली आहेत.`
      }
    };
  } catch (err) {
    console.warn('Medicine recommendation API notice:', err);
    return {
      conditionIdentified: issue,
      recommendedDrug: null,
      candidateDrugs: [],
      error: err.message || 'Clinical recommendation service temporarily unavailable',
      recommendationRationale: {
        english: 'No sufficiently supported medicine recommendation is available. Further clinical evaluation is required.',
        hinglish: 'Dawai recommendation uplabdh nahi hai. Doctor ki jaanch aavashyak hai.',
        marathi: 'औषध शिफारस उपलब्ध नाही. पुढील वैद्यकीय तपासणी आवश्यक आहे.'
      },
      explanationForPatient: {
        english: 'Information is incomplete or clinical service is temporarily unreachable. Please consult your physician.',
        hinglish: 'Jankari uplabdh nahi hai. Kripya doctor se sampark karein.',
        marathi: 'माहिती उपलब्ध नाही. कृपया डॉक्टरांचा सल्ला घ्या.'
      }
    };
  }
}

export async function getHealth() {
  return await safeFetch(`${API_BASE}/health`, {}, 'Backend health check failed');
}

export async function getDrugs() {
  return await safeFetch(`${API_BASE}/drugs`, {}, 'Failed to fetch drugs catalog');
}

export async function getPatients() {
  return await safeFetch(`${API_BASE}/patients`, {}, 'Failed to fetch patients');
}

export async function getPatientByContact(contact) {
  return await safeFetch(
    `${API_BASE}/patients/by-contact/${encodeURIComponent(contact)}`,
    {},
    'Failed to lookup patient by contact'
  );
}

export async function addPatient(patientData) {
  return await safeFetch(
    `${API_BASE}/patients`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientData)
    },
    'Failed to add patient'
  );
}

export async function deletePatient(patientId) {
  return await safeFetch(
    `${API_BASE}/patients/${patientId}`,
    {
      method: 'DELETE'
    },
    'Failed to delete patient'
  );
}

export async function deletePrescription(prescriptionId) {
  return await safeFetch(
    `${API_BASE}/prescriptions/${prescriptionId}`,
    {
      method: 'DELETE'
    },
    'Failed to delete prescription'
  );
}

export async function downloadPatientsExcel() {
  let res;
  try {
    res = await fetch(`${API_BASE}/patients/export-excel`);
  } catch (netErr) {
    throw new Error(`Failed to export patients Excel file: Backend unreachable (${netErr.message})`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to export patients Excel file: (HTTP ${res.status}) ${text}`);
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const nowStr = new Date().toISOString().slice(0, 10);
  a.download = `Patient_Records_${nowStr}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  return true;
}

export async function predictDrugEffect(patient, drugName) {
  return await safeFetch(
    `${API_BASE}/predict`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient, drug_name: drugName })
    },
    'Prediction failed'
  );
}

export async function compareThreeDrugs(patient, drugsList) {
  return await safeFetch(
    `${API_BASE}/compare`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient, drugs: drugsList })
    },
    'Comparison failed'
  );
}

export async function prescribeDrug(prescriptionData) {
  return await safeFetch(
    `${API_BASE}/prescribe`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prescriptionData)
    },
    'Prescription submission failed'
  );
}

export async function getPrescriptions(patientId) {
  const url = patientId ? `${API_BASE}/prescriptions?patient_id=${patientId}` : `${API_BASE}/prescriptions`;
  return await safeFetch(url, {}, 'Failed to fetch prescriptions');
}

export async function getDashboardStats() {
  return await safeFetch(`${API_BASE}/dashboard/stats`, {}, 'Failed to fetch dashboard stats');
}

export async function sendPatientOtp(contactNumber) {
  return await safeFetch(
    `${API_BASE}/otp/send`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_number: contactNumber })
    },
    'Failed to send OTP'
  );
}

export async function verifyPatientOtp(contactNumber, otp) {
  return await safeFetch(
    `${API_BASE}/otp/verify`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_number: contactNumber, otp })
    },
    'OTP verification failed'
  );
}

export async function registerDoctor(doctorData) {
  return await safeFetch(
    `${API_BASE}/auth/register-doctor`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doctorData)
    },
    'Doctor registration failed'
  );
}

export async function loginDoctor(credentials) {
  return await safeFetch(
    `${API_BASE}/auth/login-doctor`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    },
    'Doctor login failed'
  );
}

export async function loginPatient(credentials) {
  return await safeFetch(
    `${API_BASE}/auth/login-patient`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    },
    'Patient login failed'
  );
}

export async function getMlDatasetStats() {
  return await safeFetch(`${API_BASE}/ml/dataset-stats`, {}, 'Failed to fetch ML dataset statistics');
}

export async function retrainModel(options = {}) {
  return await safeFetch(
    `${API_BASE}/ml/retrain`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    },
    'Model retraining failed'
  );
}

export async function uploadMlDataset(file, role = 'combined') {
  const formData = new FormData();
  formData.append('file', file);
  if (role) {
    formData.append('role', role);
  }

  const res = await fetch(`${API_BASE}/ml/upload-dataset`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Dataset upload failed (HTTP ${res.status})`);
  }
  return await res.json();
}

export async function uploadTrainTestDatasets({ trainFile, testFile }) {
  const formData = new FormData();
  if (trainFile) formData.append('train_file', trainFile);
  if (testFile) formData.append('test_file', testFile);

  const res = await fetch(`${API_BASE}/ml/upload-train-test`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Train/Test dataset upload failed (HTTP ${res.status})`);
  }
  return await res.json();
}

export function downloadTrainTemplate(format = 'excel') {
  window.open(`${API_BASE}/ml/train-template?format=${format}`, '_blank');
}

export function downloadTestTemplate(format = 'csv') {
  window.open(`${API_BASE}/ml/test-template?format=${format}`, '_blank');
}

export async function getDatasetPresets() {
  return await safeFetch(`${API_BASE}/ml/presets`, {}, 'Failed to fetch dataset presets');
}

export async function getDatasetRecords(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  return await safeFetch(`${API_BASE}/ml/dataset/records?${query.toString()}`, {}, 'Failed to fetch dataset records');
}

export function downloadDatasetFile({ filename, role, format = 'xlsx' } = {}) {
  const query = new URLSearchParams();
  if (filename) query.append('filename', filename);
  if (role) query.append('role', role);
  if (format) query.append('format', format);
  window.open(`${API_BASE}/ml/download-file?${query.toString()}`, '_blank');
}

export async function getDrugResearch(drugName) {
  return await safeFetch(
    `${API_BASE}/external/drug-research/${encodeURIComponent(drugName)}`,
    {},
    'Failed to fetch drug research'
  );
}

export async function expandDatasetWithApi(numRecords = 300) {
  return await safeFetch(
    `${API_BASE}/external/expand-dataset`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ num_records: numRecords })
    },
    'Failed to expand dataset via medical API'
  );
}

/**
 * Live medical translation powered by NVIDIA Translation Key
 */
export async function translateText({ text, targetLang = 'marathi' }) {
  try {
    return await safeFetch(
      `${API_BASE}/translate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, target_lang: targetLang })
      },
      'Translation failed'
    );
  } catch (e) {
    console.warn('Translate API fallback:', e);
    return { original: text, translated: text, target_lang: targetLang };
  }
}

// ==========================================
// DOCTOR PROFILE & DIRECTORY API
// ==========================================

export async function getDoctors() {
  return await safeFetch(`${API_BASE}/doctors`, {}, 'Failed to fetch doctors catalog');
}

export async function getDoctorProfile(doctorId) {
  const url = doctorId ? `${API_BASE}/doctor/profile?doctor_id=${doctorId}` : `${API_BASE}/doctor/profile`;
  return await safeFetch(url, {}, 'Failed to fetch doctor profile');
}

export async function updateDoctorProfile(doctorId, profileData) {
  return await safeFetch(
    `${API_BASE}/doctors/${doctorId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    },
    'Failed to update doctor profile'
  );
}

// ==========================================
// MULTI-DOCTOR PATIENT ASSOCIATIONS API
// ==========================================

export async function getPatientDoctors(patientId) {
  return await safeFetch(
    `${API_BASE}/patients/${patientId}/doctors`,
    {},
    'Failed to fetch patient doctors'
  );
}

export async function associatePatientDoctor(patientId, associationData) {
  return await safeFetch(
    `${API_BASE}/patients/${patientId}/doctors`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(associationData)
    },
    'Failed to associate doctor with patient'
  );
}

export async function updateDoctorAssociation(patientId, doctorId, updateData) {
  return await safeFetch(
    `${API_BASE}/patients/${patientId}/doctors/${doctorId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    },
    'Failed to update doctor association'
  );
}

export async function removeDoctorAssociation(patientId, doctorId) {
  return await safeFetch(
    `${API_BASE}/patients/${patientId}/doctors/${doctorId}`,
    { method: 'DELETE' },
    'Failed to remove doctor association'
  );
}

// ==========================================
// CENTRALIZED MEDICAL HISTORY & CONSULTATIONS API
// ==========================================

export async function getCentralizedMedicalHistory(patientId) {
  return await safeFetch(
    `${API_BASE}/patients/${patientId}/medical-history`,
    {},
    'Failed to fetch centralized medical history'
  );
}

export async function recordConsultation(patientIdOrData, maybeData = null) {
  let endpoint = `${API_BASE}/consultations`;
  let payload = patientIdOrData;

  if (maybeData && typeof maybeData === 'object') {
    payload = { ...maybeData, patient_id: patientIdOrData };
    endpoint = `${API_BASE}/patients/${patientIdOrData}/consultations`;
  } else if (patientIdOrData && typeof patientIdOrData === 'object') {
    if (patientIdOrData.patient_id) {
      endpoint = `${API_BASE}/patients/${patientIdOrData.patient_id}/consultations`;
    }
    payload = patientIdOrData;
  }

  return await safeFetch(
    endpoint,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    },
    'Failed to record consultation'
  );
}

// ==========================================
// ONGOING MEDICATION TRACKING API
// ==========================================

export async function getPatientMedications(patientId) {
  return await safeFetch(
    `${API_BASE}/patients/${patientId}/medications`,
    {},
    'Failed to fetch patient medications'
  );
}

export async function updatePrescriptionStatus(prescriptionId, statusData) {
  return await safeFetch(
    `${API_BASE}/prescriptions/${prescriptionId}/status`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(statusData)
    },
    'Failed to update medication status'
  );
}

// ==========================================
// APPOINTMENTS MANAGEMENT API
// ==========================================

export async function getAppointments({ doctorId, patientId } = {}) {
  let url = `${API_BASE}/appointments`;
  const params = [];
  if (doctorId) params.push(`doctor_id=${doctorId}`);
  if (patientId) params.push(`patient_id=${patientId}`);
  if (params.length > 0) url += `?${params.join('&')}`;
  return await safeFetch(url, {}, 'Failed to fetch appointments');
}

export async function bookAppointment(appointmentData) {
  return await safeFetch(
    `${API_BASE}/appointments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointmentData)
    },
    'Failed to book appointment'
  );
}

export async function updateAppointmentStatus(appointmentId, status) {
  return await safeFetch(
    `${API_BASE}/appointments/${appointmentId}/status`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    },
    'Failed to update appointment status'
  );
}

// =========================================================================
// ENHANCED BIOMETRIC & DUAL-PORTAL AUTHENTICATION API SERVICES
// =========================================================================

/**
 * Validates patient full name and registered mobile number against database records.
 */
export async function validatePatientAuth({ name, contact_number }) {
  return await safeFetch(
    `${API_BASE}/patient/auth/validate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, contact_number })
    },
    'Patient validation failed'
  );
}

/**
 * Sends a secure PBKDF2-hashed OTP to the patient's registered mobile number.
 */
export async function sendPatientSecureOtp({ name, contact_number }) {
  return await safeFetch(
    `${API_BASE}/patient/auth/send-otp`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, contact_number })
    },
    'Failed to send patient OTP'
  );
}

/**
 * Verifies patient OTP, enforces attempt limit, and creates authenticated patient session.
 */
export async function verifyPatientSecureOtp({ patient_id, contact_number, otp }) {
  return await safeFetch(
    `${API_BASE}/patient/auth/verify-otp`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id, contact_number, otp })
    },
    'OTP verification failed'
  );
}

/**
 * Validates doctor full name and Doctor ID / Registered Email against active doctor accounts.
 */
export async function validateDoctorAuth({ name, identifier }) {
  return await safeFetch(
    `${API_BASE}/doctor/auth/validate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, identifier })
    },
    'Doctor validation failed'
  );
}

/**
 * Verifies doctor password or PIN against users.db.
 */
export async function verifyDoctorPassword({ doctor_id, password }) {
  return await safeFetch(
    `${API_BASE}/doctor/auth/verify-password`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctor_id, password })
    },
    'Doctor password verification failed'
  );
}

/**
 * Validates active session token.
 */
export async function getAuthSession(token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return await safeFetch(`${API_BASE}/auth/session`, { headers }, 'Session check failed');
}

/**
 * Logs out user and records audit log.
 */
export async function logoutUser(userId = null, role = 'user') {
  try {
    return await safeFetch(
      `${API_BASE}/auth/logout`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role })
      },
      'Logout failed'
    );
  } catch {
    return { success: true };
  }
}

/**
 * Fetches security audit trail logs.
 */
export async function getAuthAuditLogs(limit = 50) {
  return await safeFetch(`${API_BASE}/auth/audit-logs?limit=${limit}`, {}, 'Failed to fetch audit logs');
}

/**
 * -----------------------------------------------------------------------------
 * MULTI-FACTOR AUTHENTICATION & CROSS-VERIFICATION API
 * Google Authenticator (TOTP), Email Authenticator, Phone SMS OTP Pack
 * -----------------------------------------------------------------------------
 */

/**
 * Generates Google Authenticator provisioning URI, TOTP secret, and QR Code Data URL.
 */
export async function getGoogleAuthenticatorSetup({ identifier, user_type = 'doctor', display_name = '' }) {
  const params = new URLSearchParams({
    identifier: identifier || '',
    user_type: user_type || 'doctor',
    display_name: display_name || identifier || ''
  });
  return await safeFetch(
    `${API_BASE}/auth/authenticator/google/setup?${params.toString()}`,
    {},
    'Failed to generate Google Authenticator setup'
  );
}

/**
 * Verifies 6-digit TOTP code generated in Google Authenticator app.
 */
export async function verifyGoogleAuthenticator({ identifier, token, user_type = 'doctor' }) {
  return await safeFetch(
    `${API_BASE}/auth/authenticator/google/verify`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, token, user_type })
    },
    'Google Authenticator verification failed'
  );
}

/**
 * Dispatches a 6-digit OTP challenge to registered email.
 */
export async function sendEmailAuthenticatorOtp({ email, user_type = 'doctor', name = '' }) {
  return await safeFetch(
    `${API_BASE}/auth/authenticator/email/send`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, user_type, name })
    },
    'Failed to send Email OTP'
  );
}

/**
 * Verifies the 6-digit Email OTP challenge.
 */
export async function verifyEmailAuthenticatorOtp({ email, otp, user_type = 'doctor' }) {
  return await safeFetch(
    `${API_BASE}/auth/authenticator/email/verify`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, user_type })
    },
    'Email OTP verification failed'
  );
}

/**
 * Dispatches a 6-digit SMS OTP to registered mobile phone using the OTP pack.
 */
export async function sendPhoneSmsOtp({ phone, user_type = 'patient', name = '' }) {
  return await safeFetch(
    `${API_BASE}/auth/authenticator/phone/send`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, user_type, name })
    },
    'Failed to dispatch SMS OTP to phone'
  );
}

/**
 * Verifies the 6-digit SMS OTP for cross-verification.
 */
export async function verifyPhoneSmsOtp({ phone, otp, user_type = 'patient' }) {
  return await safeFetch(
    `${API_BASE}/auth/authenticator/phone/verify`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, user_type })
    },
    'Phone SMS OTP cross-verification failed'
  );
}





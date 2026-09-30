// API communication service for DrugAI backend

const API_BASE = '/api';

// ============================================================================
// GEMINI API - Personalized Drug Insights (Body Effects, Side Effects, Advisory)
// ============================================================================
const GEMINI_API_KEY = 'AIzaSyBEemnnSfXP1-saBUE9S31igMk0k8xZgHk';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Get personalized drug analysis via Gemini API.
 * Returns: { bodyEffects, sideEffects, advisory, allergyWarnings }
 * Adapts content based on patient age group, allergies, and drug(s).
 */
export async function getGeminiDrugAnalysis({ drugNames, patient, lang = 'english' }) {
  const drugs = Array.isArray(drugNames) ? drugNames : [drugNames];
  const ageNum = parseInt(patient?.age || '30');
  const ageGroup = ageNum < 12 ? 'child (pediatric)' : ageNum < 18 ? 'adolescent' : ageNum >= 60 ? 'elderly (geriatric)' : 'adult';
  const allergies = patient?.allergies || 'None';
  const conditions = [patient?.current_health_issue, patient?.existing_diseases].filter(Boolean).join(', ') || 'General';
  const isPregnant = patient?.is_pregnant ? ', currently pregnant' : '';
  const langInstruction = lang === 'marathi'
    ? 'Respond in Marathi (Devanagari script) mixed with some medical English terms.'
    : lang === 'hinglish'
    ? 'Respond in Hinglish (Hindi words written in English script mixed with English medical terms).'
    : 'Respond in clear, simple English suitable for a doctor.';

  const prompt = `You are a clinical pharmacology AI assistant integrated into a hospital prescription system.

Patient Profile:
- Age: ${patient?.age || 'Unknown'} years (${ageGroup}${isPregnant})
- Gender: ${patient?.gender || 'Unknown'}
- Medical Conditions: ${conditions}
- Known Allergies: ${allergies}
- Current Medications: ${patient?.current_medications || 'None'}

Prescribed Medicine(s): ${drugs.join(', ')}

${langInstruction}

Provide a structured JSON response with these EXACT keys (no markdown, pure JSON):
{
  "bodyEffects": [
    { "title": "...", "description": "...", "organ": "stomach|liver|heart|brain|kidneys|lungs" }
  ],
  "sideEffects": [
    { "effect": "...", "severity": "mild|moderate|severe", "incidence": "e.g. 3%", "ageNote": "specific note if relevant for ${ageGroup}" }
  ],
  "allergyWarnings": [
    { "allergen": "...", "risk": "...", "recommendation": "..." }
  ],
  "advisory": {
    "english": "2-3 sentence personalized clinical advisory in English for a ${ageGroup} patient with allergies: ${allergies}",
    "hinglish": "2-3 sentence advisory in Hinglish",
    "marathi": "2-3 sentence advisory in Marathi"
  },
  "interactions": "Brief drug interaction note if multiple medicines prescribed",
  "ageSpecificWarning": "Any specific warning for ${ageGroup} patients taking these medicines"
}

Make all content specific to the patient's age group (${ageGroup}), allergies (${allergies}), and conditions. Keep it clinically accurate.`;

  const res = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1200 }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Gemini API call failed');
  }

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  // Strip markdown code fences if present
  const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fallback: extract JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Failed to parse Gemini response');
  }
}

/**
 * Get allergy cross-reference for a specific drug vs patient allergies via Gemini
 */
export async function checkAllergyConflict({ drugName, allergies }) {
  if (!allergies || allergies.toLowerCase() === 'none') return null;

  const prompt = `You are a clinical safety pharmacist. Check if the drug "${drugName}" has any cross-reactivity or conflict with these patient allergies: "${allergies}".

Respond ONLY in pure JSON (no markdown):
{
  "hasConflict": true|false,
  "conflicts": [{ "allergen": "...", "type": "direct|cross-reactive|precaution", "description": "...", "action": "avoid|caution|monitor" }],
  "safetyLevel": "safe|caution|avoid",
  "clinicalNote": "One sentence summary"
}`;

  const res = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 400 }
    })
  });

  if (!res.ok) return null;
  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return null;
  }
}

export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Backend health check failed');
  return res.json();
}

export async function getDrugs() {
  const res = await fetch(`${API_BASE}/drugs`);
  if (!res.ok) throw new Error('Failed to fetch drugs catalog');
  return res.json();
}

export async function getPatients() {
  const res = await fetch(`${API_BASE}/patients`);
  if (!res.ok) throw new Error('Failed to fetch patients');
  return res.json();
}

export async function addPatient(patientData) {
  const res = await fetch(`${API_BASE}/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patientData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to add patient');
  return data;
}

export async function predictDrugEffect(patient, drugName) {
  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient, drug_name: drugName })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Prediction failed');
  return data;
}

export async function compareThreeDrugs(patient, drugsList) {
  const res = await fetch(`${API_BASE}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient, drugs: drugsList })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Comparison failed');
  return data;
}

export async function prescribeDrug(prescriptionData) {
  const res = await fetch(`${API_BASE}/prescribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prescriptionData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Prescription submission failed');
  return data;
}

export async function getPrescriptions(patientId) {
  const url = patientId ? `${API_BASE}/prescriptions?patient_id=${patientId}` : `${API_BASE}/prescriptions`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch prescriptions');
  return res.json();
}

export async function getDashboardStats() {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
}

export async function sendPatientOtp(contactNumber) {
  const res = await fetch(`${API_BASE}/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contact_number: contactNumber })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
  return data;
}

export async function verifyPatientOtp(contactNumber, otp) {
  const res = await fetch(`${API_BASE}/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contact_number: contactNumber, otp })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'OTP verification failed');
  return data;
}

export async function registerDoctor(doctorData) {
  const res = await fetch(`${API_BASE}/auth/register-doctor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doctorData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Doctor registration failed');
  return data;
}

export async function loginDoctor(credentials) {
  const res = await fetch(`${API_BASE}/auth/login-doctor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Doctor login failed');
  return data;
}

export async function getMlDatasetStats() {
  const res = await fetch(`${API_BASE}/ml/dataset-stats`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch ML dataset statistics');
  return data;
}

export async function retrainModel() {
  const res = await fetch(`${API_BASE}/ml/retrain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Model retraining failed');
  return data;
}

export async function getDrugResearch(drugName) {
  const res = await fetch(`${API_BASE}/external/drug-research/${encodeURIComponent(drugName)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch drug research');
  return data;
}

export async function expandDatasetWithApi(numRecords = 300) {
  const res = await fetch(`${API_BASE}/external/expand-dataset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ num_records: numRecords })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to expand dataset via medical API');
  return data;
}


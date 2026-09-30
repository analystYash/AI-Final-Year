import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  RotateCw, ZoomIn, ZoomOut, Info, Activity, Play, Pause,
  RefreshCw, Eye, Sparkles, Zap, Heart, Brain, Utensils,
  Layers, ArrowLeft, Maximize2, ShieldAlert, CheckCircle2,
  ChevronRight, Scan, Radio, Flame, Box
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function HumanBody3D({ targetOrgans = [], drugName = '', riskLevel = 'LOW' }) {
  const { lang, t } = useLanguage();
  const mountRef = useRef(null);

  // View States
  const [viewMode, setViewMode] = useState('xray'); // 'xray' | 'surface' | 'wireframe'
  const [selectedOrgan, setSelectedOrgan] = useState(null); // Selected organ key for info
  const [focusedOrgan, setFocusedOrgan] = useState(null); // null = full body, 'heart'|'brain'|... = deep organ scan
  const [autoRotate, setAutoRotate] = useState(false);
  const [simPlaying, setSimPlaying] = useState(true);
  const [simStage, setSimStage] = useState(1); // 1: Ingestion, 2: Digestion, 3: Circulation, 4: Target Effect
  const [simSpeed, setSimSpeed] = useState(1);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState(false);

  // References
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const organMeshesRef = useRef({});
  const particleSystemRef = useRef(null);
  const animFrameRef = useRef(null);
  const simProgressRef = useRef(0);
  const humanModelGroupRef = useRef(null);
  const organFocusGroupRef = useRef(null);

  // Comprehensive Drug to Target Organ Fallback Mapping
  const DRUG_TARGET_MAP = useMemo(() => ({
    pantoprazole: ['stomach'],
    omeprazole: ['stomach'],
    rabeprazole: ['stomach'],
    esomeprazole: ['stomach'],
    amlodipine: ['heart'],
    lisinopril: ['heart', 'kidneys'],
    losartan: ['heart', 'kidneys'],
    metoprolol: ['heart'],
    atorvastatin: ['liver', 'heart'],
    warfarin: ['heart', 'liver'],
    aspirin: ['heart', 'stomach'],
    clopidogrel: ['heart'],
    furosemide: ['kidneys', 'heart'],
    spironolactone: ['kidneys', 'heart'],
    metformin: ['liver', 'kidneys', 'stomach'],
    glimepiride: ['liver', 'kidneys'],
    empagliflozin: ['kidneys', 'heart'],
    insulin: ['liver', 'kidneys'],
    levothyroxine: ['heart', 'liver'],
    paracetamol: ['liver', 'brain'],
    ibuprofen: ['stomach', 'kidneys'],
    tramadol: ['brain'],
    celecoxib: ['heart', 'stomach'],
    salbutamol: ['lungs'],
    montelukast: ['lungs'],
    budesonide: ['lungs'],
    amoxicillin: ['kidneys', 'stomach'],
    azithromycin: ['lungs', 'liver'],
    ciprofloxacin: ['kidneys', 'stomach'],
    sertraline: ['brain'],
    alprazolam: ['brain']
  }), []);

  // Normalized active target organ keys (checks props and drugName)
  const activeKeys = useMemo(() => {
    const fromProps = (targetOrgans || []).map(o => {
      if (typeof o === 'string') return o.toLowerCase();
      return (o?.key || o?.name || '').toLowerCase();
    }).filter(Boolean);

    if (fromProps.length > 0 && !fromProps.every(k => k === 'unknown' || k === 'other')) {
      return fromProps;
    }

    // Deduce from drugName
    const dLower = (drugName || '').toLowerCase();
    for (const [key, organs] of Object.entries(DRUG_TARGET_MAP)) {
      if (dLower.includes(key)) {
        return organs;
      }
    }
    return ['stomach'];
  }, [targetOrgans, drugName, DRUG_TARGET_MAP]);

  // Comprehensive Anatomical Organ Definitions & Clinical Metadata
  const ORGAN_DEFINITIONS = useMemo(() => ({
    brain: {
      name: lang === 'marathi' ? 'मेंदू (Brain)' : (lang === 'hinglish' ? 'Brain (Dimaag)' : 'Brain & Central Nervous System'),
      shortName: lang === 'marathi' ? 'मेंदू' : (lang === 'hinglish' ? 'Dimaag' : 'Brain'),
      color: 0xa855f7,
      glowColor: 0xc084fc,
      position: [0, 1.25, 0.02],
      scale: [0.26, 0.22, 0.26],
      glbFile: '/models/brain.glb',
      animation: 'synaptic',
      description: lang === 'marathi'
        ? 'न्यूरोलॉजिकल नियंत्रण, संवेदना, रक्तदाब नियमन आणि केंद्रीय मज्जासंस्था केंद्र.'
        : (lang === 'hinglish'
        ? 'Neuro-transmission, sochne aur sensory controls ka mukhya organ.'
        : 'Controls neurotransmission, blood-brain barrier permeability, central autonomic regulation, and cognitive signaling.'),
      clinicalTarget: lang === 'marathi'
        ? 'रिसेप्टर बाइंडिंग, मेंदूतील रक्तप्रवाह व न्यूरोलॉजिकल सुरक्षितता'
        : (lang === 'hinglish'
        ? 'Receptor binding, sedation risk aur neuro-protection'
        : 'Receptor binding affinity, sedation risk, and neurological safety profiling.')
    },
    heart: {
      name: lang === 'marathi' ? 'हृदय (Heart)' : (lang === 'hinglish' ? 'Heart (Dil)' : 'Cardiovascular System (Heart)'),
      shortName: lang === 'marathi' ? 'हृदय' : (lang === 'hinglish' ? 'Dil' : 'Heart'),
      color: 0xff0055,
      glowColor: 0xf43f5e,
      position: [-0.06, 0.58, 0.11],
      scale: [0.18, 0.20, 0.16],
      glbFile: '/models/heart.glb',
      animation: 'heartbeat',
      description: lang === 'marathi'
        ? 'रक्ताभिसरण, हृदयाचे ठोके (हार्ट रेट) आणि धमन्यांमधील रक्तदाब नियमनाचे मुख्य केंद्र.'
        : (lang === 'hinglish'
        ? 'Pure sharir me blood pump aur pressure control karne wala mukhya hissa.'
        : 'Pumps oxygenated blood systemically, maintains arterial pressure, cardiac output, and myocardial conduction.'),
      clinicalTarget: lang === 'marathi'
        ? 'हृदयाचे ठोके, रक्तदाब स्थिरता व कार्डिओव्हॅस्क्युलर ताण'
        : (lang === 'hinglish'
        ? 'Heart rate, BP stability aur arrhythmia risk'
        : 'QT interval stability, stroke volume, myocardial perfusion, and hemodynamic balance.')
    },
    lungs: {
      name: lang === 'marathi' ? 'फुफ्फुसे (Lungs)' : (lang === 'hinglish' ? 'Lungs (Fefde)' : 'Respiratory System (Lungs)'),
      shortName: lang === 'marathi' ? 'फुफ्फुसे' : (lang === 'hinglish' ? 'Fefde' : 'Lungs'),
      color: 0x00f2fe,
      glowColor: 0x38bdf8,
      position: [0, 0.58, 0.04],
      scale: [0.42, 0.30, 0.24],
      glbFile: '/models/lung.glb',
      animation: 'breathing',
      description: lang === 'marathi'
        ? 'ऑक्सिजन देवाणघेवाण, श्वसन प्रक्रियेचे नियंत्रण आणि रक्त आम्ल-अल्कली संतुलन.'
        : (lang === 'hinglish'
        ? 'Oxygen exchange aur breathing process ko chalata hai.'
        : 'Facilitates alveolar oxygen-CO2 exchange, pulmonary compliance, and systemic acid-base balance.'),
      clinicalTarget: lang === 'marathi'
        ? 'श्वसन क्षमता, ऑक्सिजन पातळी व फुफ्फुसांचा प्रतिकार'
        : (lang === 'hinglish'
        ? 'Breathing rate, airway clear hone ki sthiti'
        : 'Alveolar gas exchange, pulmonary vasculature resistance, and airway clearance.')
    },
    stomach: {
      name: lang === 'marathi' ? 'जठर / पोट (Stomach)' : (lang === 'hinglish' ? 'Stomach (Pet)' : 'Gastrointestinal System (Stomach)'),
      shortName: lang === 'marathi' ? 'जठर' : (lang === 'hinglish' ? 'Stomach' : 'Stomach'),
      color: 0xf59e0b,
      glowColor: 0xfcd34d,
      position: [0.10, 0.20, 0.09],
      scale: [0.19, 0.16, 0.15],
      glbFile: '/models/stomach.glb',
      animation: 'digesting',
      description: lang === 'marathi'
        ? 'औषध विघटन, आम्लता नियंत्रण (pH) आणि पचनसंस्थेचे मुख्य कार्य.'
        : (lang === 'hinglish'
        ? 'Dawai ka dissolve hona, absorption aur acid balance yahan hota hai.'
        : 'Primary site of oral drug dissolution, gastric acid secretion (H+/K+ ATPase), and mucosal absorption.'),
      clinicalTarget: lang === 'marathi'
        ? 'गॅस्ट्रिक आम्लता नियंत्रण व श्लिष्मल त्वचेचे रक्षण'
        : (lang === 'hinglish'
        ? 'Gastric acid level aur pet ki mucosal safety'
        : 'Acid suppression rate, mucosal layer preservation, and bioavailability.')
    },
    liver: {
      name: lang === 'marathi' ? 'यकृत (Liver)' : (lang === 'hinglish' ? 'Liver (Jigar)' : 'Hepatic System (Liver)'),
      shortName: lang === 'marathi' ? 'यकृत' : (lang === 'hinglish' ? 'Jigar' : 'Liver'),
      color: 0xf97316,
      glowColor: 0xfb923c,
      position: [-0.14, 0.20, 0.08],
      scale: [0.26, 0.18, 0.18],
      glbFile: '/models/liver.glb',
      animation: 'pulsing',
      description: lang === 'marathi'
        ? 'औषधांचे चयापचय (CYP450 एन्झाईम्स - CYP2C19, CYP3A4) आणि शरीराचे विषहरण प्रक्रिया.'
        : (lang === 'hinglish'
        ? 'Dawaiyon ka metabolism (CYP450) aur detoxification karta hai.'
        : 'Primary site of drug biotransformation, CYP450 hepatic clearance, biliary excretion, and detoxification.'),
      clinicalTarget: lang === 'marathi'
        ? 'CYP450 चयापचय दर, एन्झाईम ताण व यकृत कार्य (LFT)'
        : (lang === 'hinglish'
        ? 'CYP450 metabolism speed aur liver enzyme load'
        : 'CYP2C19 / CYP3A4 enzyme saturation, first-pass metabolism, and hepatic load.')
    },
    kidneys: {
      name: lang === 'marathi' ? 'मूत्रपिंड (Kidneys)' : (lang === 'hinglish' ? 'Kidneys (Gurde)' : 'Renal System (Kidneys)'),
      shortName: lang === 'marathi' ? 'मूत्रपिंड' : (lang === 'hinglish' ? 'Gurde' : 'Kidneys'),
      color: 0x10b981,
      glowColor: 0x34d399,
      position: [0, -0.04, -0.06],
      scale: [0.34, 0.14, 0.12],
      glbFile: '/models/kidney.glb',
      animation: 'filtering',
      description: lang === 'marathi'
        ? 'औषधांचे शरीराबाहेर उत्सर्जन, द्रव संतुलन (Glomerular Filtration) आणि रक्तदाब नियंत्रण.'
        : (lang === 'hinglish'
        ? 'Blood filtration, dawaiyon ka nikalna (clearance) aur water balance maintain karta hai.'
        : 'Glomerular filtration, metabolite elimination, fluid-electrolyte homeostasis, and renal clearance.'),
      clinicalTarget: lang === 'marathi'
        ? 'जीएफआर (GFR) उत्सर्जन दर, द्रव संतुलन व रीनल सुरक्षितता'
        : (lang === 'hinglish'
        ? 'GFR filtering speed aur urine clearance rate'
        : 'Estimated GFR clearance, tubular secretion kinetics, and nephrotoxicity safety.')
    }
  }), [lang]);

  // Risk styling
  const riskTheme = useMemo(() => {
    const r = (riskLevel || 'LOW').toUpperCase();
    if (r.includes('HIGH') || r.includes('CRITICAL')) {
      return {
        badgeBg: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
        dot: 'bg-rose-500',
        pulseHex: 0xff0055,
        label: lang === 'marathi' ? 'उच्च जोखीम' : (lang === 'hinglish' ? 'High Risk' : 'High Risk')
      };
    }
    if (r.includes('MOD') || r.includes('MED')) {
      return {
        badgeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
        dot: 'bg-amber-500',
        pulseHex: 0xf59e0b,
        label: lang === 'marathi' ? 'मध्यम जोखीम' : (lang === 'hinglish' ? 'Moderate Risk' : 'Moderate Risk')
      };
    }
    return {
      badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      dot: 'bg-emerald-400',
      pulseHex: 0x10b981,
      label: lang === 'marathi' ? 'कमी जोखीम' : (lang === 'hinglish' ? 'Safe / Low Risk' : 'Safe / Low Risk')
    };
  }, [riskLevel, lang]);

  // =========================================================================
  // HELPER: APPLY SKIN MATERIAL ACCORDING TO VIEW MODE
  // =========================================================================
  const applyHumanSkinMaterial = useCallback((object, mode) => {
    object.traverse((child) => {
      if (child.isMesh) {
        if (mode === 'xray') {
          child.material = new THREE.MeshPhysicalMaterial({
            color: 0x0284c7, // Bio-electric Cyan Blue
            transparent: true,
            opacity: 0.28,
            roughness: 0.15,
            metalness: 0.2,
            transmission: 0.72,
            ior: 1.34,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            side: THREE.DoubleSide,
            depthWrite: false
          });
        } else if (mode === 'surface') {
          child.material = new THREE.MeshStandardMaterial({
            color: 0xd4a373, // Warm anatomical skin tone
            roughness: 0.55,
            metalness: 0.08,
            side: THREE.DoubleSide
          });
        } else if (mode === 'wireframe') {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x00f2fe,
            emissive: 0x0284c7,
            emissiveIntensity: 0.35,
            wireframe: true,
            transparent: true,
            opacity: 0.45
          });
        }
      }
    });
  }, []);

  // =========================================================================
  // MAIN THREE.JS SCENE SETUP & ANIMATION LOOP
  // =========================================================================
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 450;

    // 1. SCENE CREATION
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. CAMERA SETUP
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0.25, 4.2);
    cameraRef.current = camera;

    // 3. RENDERER SETUP
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. ORBIT CONTROLS (FULL 360 INTERACTIVE ROTATION & ZOOM)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.2;
    controls.maxDistance = 8.5;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.target.set(0, 0.25, 0);
    controlsRef.current = controls;

    // 5. LIGHTING RIG FOR MEDICAL & ANATOMICAL VISUALIZATION
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 1.2);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(4, 8, 6);
    scene.add(keyLight);

    const cyanRim = new THREE.PointLight(0x00f2fe, 2.5, 15);
    cyanRim.position.set(-3, 3, 3);
    scene.add(cyanRim);

    const purpleBackLight = new THREE.DirectionalLight(0xa855f7, 1.8);
    purpleBackLight.position.set(0, 3, -6);
    scene.add(purpleBackLight);

    // 6. MAIN GROUPS
    const fullBodyGroup = new THREE.Group();
    scene.add(fullBodyGroup);
    humanModelGroupRef.current = fullBodyGroup;

    const organFocusGroup = new THREE.Group();
    organFocusGroup.visible = false;
    scene.add(organFocusGroup);
    organFocusGroupRef.current = organFocusGroup;

    // =========================================================================
    // LOAD REAL 3D ANATOMICAL HUMAN BODY MODEL (GLTF)
    // =========================================================================
    const gltfLoader = new GLTFLoader();
    setModelLoading(true);
    setModelError(false);

    // Try loading bioatlas_human.glb first (forward facing anatomical human body mesh)
    gltfLoader.load(
      '/models/bioatlas_human.glb',
      (gltf) => {
        const bodyScene = gltf.scene;

        // Calculate bounding box and center
        const box = new THREE.Box3().setFromObject(bodyScene);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // Target body height ~ 3.1 units
        const scale = 3.1 / (size.y || 20.74);
        bodyScene.scale.set(scale, scale, scale);

        // Center perfectly at origin
        bodyScene.position.set(
          -center.x * scale,
          -center.y * scale + 0.25,
          -center.z * scale
        );

        // Apply skin material according to view mode
        applyHumanSkinMaterial(bodyScene, viewMode);

        fullBodyGroup.add(bodyScene);
        setModelLoading(false);
      },
      undefined,
      (err) => {
        console.warn('BioAtlas GLB load failed, trying human_body.glb:', err);
        // Fallback to human_body.glb
        gltfLoader.load(
          '/models/human_body.glb',
          (gltf2) => {
            const bodyScene2 = gltf2.scene;
            const box2 = new THREE.Box3().setFromObject(bodyScene2);
            const size2 = box2.getSize(new THREE.Vector3());
            const center2 = box2.getCenter(new THREE.Vector3());

            const maxDim = Math.max(size2.x, size2.y, size2.z);
            const scale2 = 3.1 / (maxDim || 1);
            bodyScene2.scale.set(scale2, scale2, scale2);
            bodyScene2.position.set(-center2.x * scale2, -center2.y * scale2 + 0.25, -center2.z * scale2);
            bodyScene2.rotation.y = -Math.PI / 2;

            applyHumanSkinMaterial(bodyScene2, viewMode);
            fullBodyGroup.add(bodyScene2);
            setModelLoading(false);
          },
          undefined,
          (err2) => {
            console.error('All GLB models failed to load:', err2);
            setModelLoading(false);
            setModelError(true);
          }
        );
      }
    );

    // =========================================================================
    // REALISTIC ANATOMICAL ORGANS INTEGRATED INSIDE FULL BODY (X-RAY VIEW)
    // =========================================================================
    const organMeshes = {};

    // 1. ANATOMICAL BRAIN (Cerebral hemispheres + Cerebellum + Stem)
    const brainGroup = new THREE.Group();
    const hemiGeo = new THREE.SphereGeometry(0.14, 28, 24);
    hemiGeo.scale(1.25, 0.95, 0.85);

    const brainMaterial = new THREE.MeshStandardMaterial({
      color: ORGAN_DEFINITIONS.brain.color,
      emissive: ORGAN_DEFINITIONS.brain.color,
      emissiveIntensity: 0.5,
      roughness: 0.35,
      metalness: 0.2
    });

    const leftBrainHemi = new THREE.Mesh(hemiGeo, brainMaterial);
    leftBrainHemi.position.set(-0.065, 0, 0);
    const rightBrainHemi = new THREE.Mesh(hemiGeo, brainMaterial);
    rightBrainHemi.position.set(0.065, 0, 0);
    brainGroup.add(leftBrainHemi);
    brainGroup.add(rightBrainHemi);

    // Cerebellum
    const cerebellumGeo = new THREE.SphereGeometry(0.065, 18, 16);
    cerebellumGeo.scale(1.3, 0.8, 0.9);
    const cerebellum = new THREE.Mesh(cerebellumGeo, brainMaterial);
    cerebellum.position.set(0, -0.09, -0.05);
    brainGroup.add(cerebellum);

    brainGroup.position.set(...ORGAN_DEFINITIONS.brain.position);
    fullBodyGroup.add(brainGroup);
    organMeshes.brain = brainGroup;

    // 2. ANATOMICAL HEART (Multi-chambered ventricles & Aorta)
    const heartGroup = new THREE.Group();
    const ventricleGeo = new THREE.SphereGeometry(0.11, 24, 24);
    ventricleGeo.scale(0.85, 1.25, 0.85);

    const heartMat = new THREE.MeshStandardMaterial({
      color: ORGAN_DEFINITIONS.heart.color,
      emissive: ORGAN_DEFINITIONS.heart.color,
      emissiveIntensity: 0.65,
      roughness: 0.25,
      metalness: 0.35
    });

    const ventricles = new THREE.Mesh(ventricleGeo, heartMat);
    ventricles.rotation.z = -0.25;
    ventricles.rotation.x = 0.15;
    heartGroup.add(ventricles);

    // Aortic Arch curve
    const aortaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.05, 0),
      new THREE.Vector3(0.02, 0.13, 0.02),
      new THREE.Vector3(-0.04, 0.15, -0.01),
      new THREE.Vector3(-0.06, 0.08, -0.03)
    ]);
    const aortaGeo = new THREE.TubeGeometry(aortaCurve, 20, 0.026, 12, false);
    const aortaMat = new THREE.MeshStandardMaterial({
      color: 0xff1744,
      roughness: 0.3,
      metalness: 0.2
    });
    heartGroup.add(new THREE.Mesh(aortaGeo, aortaMat));

    heartGroup.position.set(...ORGAN_DEFINITIONS.heart.position);
    fullBodyGroup.add(heartGroup);
    organMeshes.heart = heartGroup;

    // 3. ANATOMICAL LUNGS (Bilateral lobes + Bronchial tree)
    const lungsGroup = new THREE.Group();
    const lungMat = new THREE.MeshStandardMaterial({
      color: ORGAN_DEFINITIONS.lungs.color,
      emissive: ORGAN_DEFINITIONS.lungs.color,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.8,
      roughness: 0.4
    });

    // Left Lung (2 lobes, cardiac notch)
    const leftLungGeo = new THREE.SphereGeometry(0.13, 24, 24);
    leftLungGeo.scale(0.85, 1.7, 0.95);
    const leftLung = new THREE.Mesh(leftLungGeo, lungMat);
    leftLung.position.set(-0.20, 0, 0.01);
    lungsGroup.add(leftLung);

    // Right Lung (3 lobes, slightly broader)
    const rightLungGeo = new THREE.SphereGeometry(0.14, 24, 24);
    rightLungGeo.scale(0.95, 1.65, 1.0);
    const rightLung = new THREE.Mesh(rightLungGeo, lungMat);
    rightLung.position.set(0.20, 0, 0.01);
    lungsGroup.add(rightLung);

    lungsGroup.position.set(...ORGAN_DEFINITIONS.lungs.position);
    fullBodyGroup.add(lungsGroup);
    organMeshes.lungs = lungsGroup;

    // 4. ANATOMICAL STOMACH (J-shaped gastric body & fundus)
    const stomachCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.02, 0.14, 0.01),
      new THREE.Vector3(0.12, 0.06, 0.05),
      new THREE.Vector3(0.08, -0.06, 0.03),
      new THREE.Vector3(-0.06, -0.08, -0.01)
    ]);
    const stomachGeo = new THREE.TubeGeometry(stomachCurve, 24, 0.085, 16, false);
    const stomachMat = new THREE.MeshStandardMaterial({
      color: ORGAN_DEFINITIONS.stomach.color,
      emissive: ORGAN_DEFINITIONS.stomach.color,
      emissiveIntensity: 0.55,
      roughness: 0.3,
      metalness: 0.2
    });
    const stomachMesh = new THREE.Mesh(stomachGeo, stomachMat);
    stomachMesh.position.set(...ORGAN_DEFINITIONS.stomach.position);
    fullBodyGroup.add(stomachMesh);
    organMeshes.stomach = stomachMesh;

    // 5. ANATOMICAL LIVER (Asymmetrical wedge-shaped right/left hepatic lobes)
    const liverGroup = new THREE.Group();
    const liverGeo = new THREE.SphereGeometry(0.16, 24, 24);
    liverGeo.scale(1.4, 0.85, 1.05);

    const liverMat = new THREE.MeshStandardMaterial({
      color: ORGAN_DEFINITIONS.liver.color,
      emissive: ORGAN_DEFINITIONS.liver.color,
      emissiveIntensity: 0.5,
      roughness: 0.35,
      metalness: 0.15
    });

    const liverMesh = new THREE.Mesh(liverGeo, liverMat);
    liverMesh.rotation.z = -0.18;
    liverMesh.rotation.y = 0.2;
    liverGroup.add(liverMesh);

    liverGroup.position.set(...ORGAN_DEFINITIONS.liver.position);
    fullBodyGroup.add(liverGroup);
    organMeshes.liver = liverGroup;

    // 6. ANATOMICAL KIDNEYS (Bean-shaped bilateral paired organs)
    const kidneysGroup = new THREE.Group();
    const kidneyGeo = new THREE.SphereGeometry(0.085, 20, 20);
    kidneyGeo.scale(0.8, 1.35, 0.75);

    const kidneyMat = new THREE.MeshStandardMaterial({
      color: ORGAN_DEFINITIONS.kidneys.color,
      emissive: ORGAN_DEFINITIONS.kidneys.color,
      emissiveIntensity: 0.55,
      roughness: 0.25,
      metalness: 0.2
    });

    const leftKidney = new THREE.Mesh(kidneyGeo, kidneyMat);
    leftKidney.position.set(-0.16, 0, 0);
    leftKidney.rotation.z = 0.15;

    const rightKidney = new THREE.Mesh(kidneyGeo, kidneyMat);
    rightKidney.position.set(0.16, -0.02, 0); // Right kidney slightly lower due to liver
    rightKidney.rotation.z = -0.15;

    kidneysGroup.add(leftKidney);
    kidneysGroup.add(rightKidney);

    kidneysGroup.position.set(...ORGAN_DEFINITIONS.kidneys.position);
    fullBodyGroup.add(kidneysGroup);
    organMeshes.kidneys = kidneysGroup;

    organMeshesRef.current = organMeshes;

    // =========================================================================
    // ESOPHAGUS & PHARMACOKINETIC PATHWAY TUBE
    // =========================================================================
    const esophagusCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.15, 0.08),
      new THREE.Vector3(0, 0.85, 0.04),
      new THREE.Vector3(0, 0.50, 0.02),
      new THREE.Vector3(0.08, 0.22, 0.08)
    ]);
    const esophagusGeo = new THREE.TubeGeometry(esophagusCurve, 20, 0.022, 12, false);
    const esophagusMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35
    });
    fullBodyGroup.add(new THREE.Mesh(esophagusGeo, esophagusMat));

    // =========================================================================
    // DYNAMIC PHARMACOKINETIC MEDICINE PARTICLES
    // =========================================================================
    const particleCount = 140;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = 0;
      particlePositions[i * 3 + 1] = 1.2;
      particlePositions[i * 3 + 2] = 0.08;

      // Radiant Gold/Cyan Glow
      particleColors[i * 3] = 0.0;
      particleColors[i * 3 + 1] = 0.95;
      particleColors[i * 3 + 2] = 1.0;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.065,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    fullBodyGroup.add(particles);
    particleSystemRef.current = particles;

    // =========================================================================
    // ANIMATION & PHYSIOLOGICAL RHYTHM LOOP
    // =========================================================================
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Controls update with damping
      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotate;
        controlsRef.current.autoRotateSpeed = 1.2;
        controlsRef.current.update();
      }

      // Heartbeat Cycle (True Systolic / Diastolic Pulse)
      if (organMeshes.heart) {
        const beat = 1 + Math.sin(elapsedTime * 6.5) * 0.08 + Math.sin(elapsedTime * 13) * 0.04;
        organMeshes.heart.scale.set(beat, beat, beat);
      }

      // Respiratory Cycle (Gentle Pulmonary Expansion)
      if (organMeshes.lungs) {
        const breath = 1 + Math.sin(elapsedTime * 2.2) * 0.038;
        organMeshes.lungs.scale.set(breath, breath, breath);
      }

      // Target Organ Risk Aura Glow
      activeKeys.forEach((k) => {
        const mesh = organMeshes[k] ||
          (k.includes('heart') || k.includes('cardio') ? organMeshes.heart :
           k.includes('brain') || k.includes('nervous') || k.includes('cns') ? organMeshes.brain :
           k.includes('kidney') || k.includes('renal') ? organMeshes.kidneys :
           k.includes('liver') || k.includes('hepatic') ? organMeshes.liver :
           k.includes('lung') || k.includes('respirat') || k.includes('bronch') ? organMeshes.lungs :
           k.includes('stomach') || k.includes('gi') || k.includes('acid') || k.includes('gastro') ? organMeshes.stomach : null);

        if (mesh && mesh !== organMeshes.heart && mesh !== organMeshes.lungs) {
          const pulse = 1 + Math.sin(elapsedTime * 4.5) * 0.055;
          mesh.scale.set(pulse, pulse, pulse);
        }
      });

      // Pharmacokinetic Particle Ingestion & Distribution Flow
      if (particles && simPlaying && fullBodyGroup.visible) {
        simProgressRef.current = (simProgressRef.current + 0.009 * simSpeed) % 4.0;
        const currentProgress = simProgressRef.current;
        const positions = particles.geometry.attributes.position.array;

        // Determine destination target organ coordinate based on activeKeys
        let targetCoords = ORGAN_DEFINITIONS.stomach.position;
        if (activeKeys.some(k => k.includes('brain') || k.includes('nervous') || k.includes('cns'))) {
          targetCoords = ORGAN_DEFINITIONS.brain.position;
        } else if (activeKeys.some(k => k.includes('heart') || k.includes('cardio') || k.includes('vascular'))) {
          targetCoords = ORGAN_DEFINITIONS.heart.position;
        } else if (activeKeys.some(k => k.includes('lung') || k.includes('respirat') || k.includes('bronch'))) {
          targetCoords = ORGAN_DEFINITIONS.lungs.position;
        } else if (activeKeys.some(k => k.includes('liver') || k.includes('hepatic'))) {
          targetCoords = ORGAN_DEFINITIONS.liver.position;
        } else if (activeKeys.some(k => k.includes('kidney') || k.includes('renal'))) {
          targetCoords = ORGAN_DEFINITIONS.kidneys.position;
        } else if (activeKeys.some(k => k.includes('stomach') || k.includes('gi') || k.includes('acid') || k.includes('gastro'))) {
          targetCoords = ORGAN_DEFINITIONS.stomach.position;
        }

        for (let i = 0; i < particleCount; i++) {
          const offset = (i / particleCount) * 0.85;
          const prog = (currentProgress + offset) % 4.0;

          if (prog < 1.0) {
            // STAGE 1: ORAL INTAKE DOWN ESOPHAGUS
            const tStage = prog;
            positions[i * 3] = (Math.random() - 0.5) * 0.035;
            positions[i * 3 + 1] = 1.15 - tStage * 0.95;
            positions[i * 3 + 2] = 0.08 - tStage * 0.03;
          } else if (prog < 2.0) {
            // STAGE 2: GASTRIC DISSOLUTION IN STOMACH
            const angle = elapsedTime * 3.5 + i;
            const radius = 0.07 * (prog - 1.0);
            positions[i * 3] = 0.10 + Math.cos(angle) * radius;
            positions[i * 3 + 1] = 0.20 + Math.sin(angle) * radius * 0.8;
            positions[i * 3 + 2] = 0.09 + Math.sin(angle) * 0.035;
          } else if (prog < 3.0) {
            // STAGE 3: CARDIOVASCULAR & HEPATIC CIRCULATION
            const tCirc = prog - 2.0;
            positions[i * 3] = -0.08 + Math.sin(tCirc * Math.PI * 2) * 0.24;
            positions[i * 3 + 1] = 0.52 + Math.cos(tCirc * Math.PI * 2) * 0.28;
            positions[i * 3 + 2] = 0.10;
          } else {
            // STAGE 4: TARGET ORGAN BINDING & RECEPTOR CONVERGENCE
            const tTarget = prog - 3.0;
            positions[i * 3] = targetCoords[0] + (Math.random() - 0.5) * 0.16 * (1 - tTarget);
            positions[i * 3 + 1] = targetCoords[1] + (Math.random() - 0.5) * 0.16 * (1 - tTarget);
            positions[i * 3 + 2] = targetCoords[2] + (Math.random() - 0.5) * 0.10;
          }
        }
        particles.geometry.attributes.position.needsUpdate = true;
      }

      // If in Organ Deep Scan mode, animate the focused organ
      if (organFocusGroup.visible && organFocusGroup.children.length > 0) {
        const focusedMesh = organFocusGroup.children[0];
        if (focusedOrgan === 'heart') {
          const beat = 1 + Math.sin(elapsedTime * 6.5) * 0.07 + Math.sin(elapsedTime * 13) * 0.035;
          focusedMesh.scale.set(beat * focusedMesh.userData.baseScale, beat * focusedMesh.userData.baseScale, beat * focusedMesh.userData.baseScale);
        } else if (focusedOrgan === 'lungs') {
          const breath = 1 + Math.sin(elapsedTime * 2.2) * 0.04;
          focusedMesh.scale.set(breath * focusedMesh.userData.baseScale, breath * focusedMesh.userData.baseScale, breath * focusedMesh.userData.baseScale);
        } else if (focusedOrgan === 'liver') {
          const pulse = 1 + Math.sin(elapsedTime * 3.0) * 0.025;
          focusedMesh.scale.set(pulse * focusedMesh.userData.baseScale, pulse * focusedMesh.userData.baseScale, pulse * focusedMesh.userData.baseScale);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // =========================================================================
    // RESIZE & INTERACTIVE RAYCASTER FOR 3D CLICKING
    // =========================================================================
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event) => {
      if (!container || focusedOrgan) return;
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const organObjects = Object.values(organMeshes);
      const intersects = raycaster.intersectObjects(organObjects, true);

      if (intersects.length > 0) {
        // Find which organ was clicked
        let hitObj = intersects[0].object;
        for (const [key, meshGroup] of Object.entries(organMeshes)) {
          if (meshGroup === hitObj || meshGroup.children.includes(hitObj)) {
            setSelectedOrgan(key);
            break;
          }
        }
      }
    };

    window.addEventListener('resize', handleResize);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (controlsRef.current) controlsRef.current.dispose();
      renderer.dispose();
    };
  }, []);

  // Update skin material when viewMode changes
  useEffect(() => {
    if (humanModelGroupRef.current) {
      applyHumanSkinMaterial(humanModelGroupRef.current, viewMode);
    }
  }, [viewMode, applyHumanSkinMaterial]);

  // Handle switching between Full Body and Focused Organ Deep Scan
  useEffect(() => {
    const fullGroup = humanModelGroupRef.current;
    const focusGroup = organFocusGroupRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (!fullGroup || !focusGroup || !camera || !controls) return;

    if (!focusedOrgan) {
      // FULL HUMAN BODY VIEW
      fullGroup.visible = true;
      focusGroup.visible = false;
      camera.position.set(0, 0.25, 4.2);
      controls.target.set(0, 0.25, 0);
      controls.update();
    } else {
      // DEDICATED ORGAN DEEP SCAN VIEW
      fullGroup.visible = false;
      focusGroup.visible = true;
      focusGroup.clear();

      const organDef = ORGAN_DEFINITIONS[focusedOrgan];
      if (!organDef) return;

      setModelLoading(true);
      const loader = new GLTFLoader();

      loader.load(
        organDef.glbFile,
        (gltf) => {
          const organScene = gltf.scene;
          const box = new THREE.Box3().setFromObject(organScene);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());

          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const targetDim = 1.85;
          const scale = targetDim / maxDim;

          organScene.scale.set(scale, scale, scale);
          organScene.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
          organScene.userData.baseScale = scale;

          focusGroup.add(organScene);
          camera.position.set(0, 0, 3.2);
          controls.target.set(0, 0, 0);
          controls.update();
          setModelLoading(false);
        },
        undefined,
        (err) => {
          console.warn('Dedicated organ GLB load error, using high-res clone:', err);
          // Fallback clone from full body mesh
          const meshOrig = organMeshesRef.current[focusedOrgan];
          if (meshOrig) {
            const clone = meshOrig.clone();
            clone.scale.set(2.4, 2.4, 2.4);
            clone.position.set(0, 0, 0);
            clone.userData.baseScale = 2.4;
            focusGroup.add(clone);
          }
          camera.position.set(0, 0, 3.2);
          controls.target.set(0, 0, 0);
          controls.update();
          setModelLoading(false);
        }
      );
    }
  }, [focusedOrgan, ORGAN_DEFINITIONS]);

  // Controls helper functions
  const handleZoom = (delta) => {
    if (!cameraRef.current) return;
    cameraRef.current.position.z = Math.max(1.5, Math.min(7.5, cameraRef.current.position.z + delta));
  };

  const handleResetView = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    if (focusedOrgan) {
      cameraRef.current.position.set(0, 0, 3.2);
      controlsRef.current.target.set(0, 0, 0);
    } else {
      cameraRef.current.position.set(0, 0.25, 4.2);
      controlsRef.current.target.set(0, 0.25, 0);
    }
    controlsRef.current.update();
  };

  const jumpToStage = (stageNum) => {
    setSimStage(stageNum);
    simProgressRef.current = stageNum - 1;
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* 3D WEBGL VIEWPORT */}
      <div
        ref={mountRef}
        className="w-full flex-1 min-h-[280px] sm:min-h-[340px] cursor-grab active:cursor-grabbing relative"
        onDoubleClick={handleResetView}
      />

      {/* TOP FLOATING HUD: DRUG BADGE & CAMERA CONTROLS */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10 gap-2">
        {/* Left: Active Drug & View Indicator */}
        <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2 pointer-events-auto shadow-lg max-w-[70%]">
          <span className={`w-2.5 h-2.5 rounded-full ${riskTheme.dot} animate-ping shrink-0`}></span>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-white truncate flex items-center gap-1.5">
              <span>{drugName || 'Pharmacokinetics'}</span>
              <span className="text-[10px] text-amber-300 font-mono font-semibold">
                → {activeKeys.map(k => ORGAN_DEFINITIONS[k]?.shortName || k).join(', ')}
              </span>
            </span>
            <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1 truncate">
              <Scan size={10} />
              {focusedOrgan ? `3D Deep Scan: ${ORGAN_DEFINITIONS[focusedOrgan]?.shortName}` : `Target: ${activeKeys.map(k => ORGAN_DEFINITIONS[k]?.shortName || k).join(', ')}`}
            </span>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 hidden sm:inline-block ${riskTheme.badgeBg}`}>
            {riskTheme.label}
          </span>
        </div>

        {/* Right: Camera, Auto-Rotate & View Mode Controls */}
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 pointer-events-auto shadow-lg">
          {/* Surface / X-Ray / Wireframe Mode Toggle */}
          {!focusedOrgan && (
            <div className="flex items-center bg-slate-950/80 rounded-lg p-0.5 border border-slate-800 mr-1">
              <button
                onClick={() => setViewMode('xray')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${viewMode === 'xray' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                title="X-Ray Bio-Scan (Translucent skin with internal organs)"
              >
                X-Ray
              </button>
              <button
                onClick={() => setViewMode('surface')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${viewMode === 'surface' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                title="Realistic Anatomical Surface"
              >
                Surface
              </button>
              <button
                onClick={() => setViewMode('wireframe')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${viewMode === 'wireframe' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                title="Cybernetic Wireframe"
              >
                Wire
              </button>
            </div>
          )}

          {/* Return to Full Body Button (if in organ deep scan) */}
          {focusedOrgan && (
            <button
              onClick={() => setFocusedOrgan(null)}
              className="px-2 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1 transition shadow mr-1"
            >
              <ArrowLeft size={13} />
              <span>{lang === 'marathi' ? 'संपूर्ण शरीर' : (lang === 'hinglish' ? 'Pure Sharir' : 'Full Body')}</span>
            </button>
          )}

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded-lg transition ${autoRotate ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            title="Auto Rotate 360°"
          >
            <RotateCw size={13} />
          </button>
          <button
            onClick={() => handleZoom(-0.4)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={() => handleZoom(0.4)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            title="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>
          <button
            onClick={handleResetView}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            title="Reset Camera View"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* LOADING OVERLAY SPINNER */}
      {modelLoading && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center pointer-events-none z-20">
          <div className="bg-slate-900/90 border border-cyan-500/40 px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-2xl animate-pulse">
            <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-bold text-slate-200">
              {lang === 'marathi' ? '3D मानवी रचना लोड होत आहे...' : (lang === 'hinglish' ? 'Real 3D Human Anatomy Load ho raha hai...' : 'Rendering Real 3D Human Anatomy...')}
            </span>
          </div>
        </div>
      )}

      {/* BOTTOM CONTROL & CLINICAL INSPECTION DOCK */}
      <div className="p-2.5 sm:p-3 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-md space-y-2 z-10">
        {/* ROW 1: SIMULATION HEADER & CONTROLS */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <Zap size={14} className="text-amber-400 animate-bounce" />
            <span className="text-[11px] sm:text-xs">
              {lang === 'marathi' ? 'औषध प्रवास व शरीरावर परिणाम अनुकरण' : (lang === 'hinglish' ? 'Dawai Safar & Asar Simulation' : 'Pharmacokinetic Pathway Simulation')}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSimPlaying(!simPlaying)}
              className="px-2 py-0.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 transition"
            >
              {simPlaying ? <Pause size={11} /> : <Play size={11} />}
              <span>{simPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <select
              value={simSpeed}
              onChange={(e) => setSimSpeed(parseFloat(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-1.5 py-0.5 text-[10px] focus:outline-none"
            >
              <option value="0.5">0.5x</option>
              <option value="1">1.0x</option>
              <option value="2">2.0x</option>
            </select>
          </div>
        </div>

        {/* ROW 2: 4-STAGE INGESTION SELECTORS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
          <button
            onClick={() => jumpToStage(1)}
            className="p-1.5 rounded-lg text-left border transition bg-slate-900/80 border-slate-800 hover:border-cyan-500"
          >
            <span className="text-[9px] text-cyan-400 block font-mono font-bold">1. {lang === 'marathi' ? 'सेवन' : (lang === 'hinglish' ? 'Ingestion' : 'Oral Intake')}</span>
            <span className="text-[11px] text-slate-200 font-semibold truncate block">Esophagus Tube</span>
          </button>

          <button
            onClick={() => jumpToStage(2)}
            className="p-1.5 rounded-lg text-left border transition bg-slate-900/80 border-slate-800 hover:border-amber-500"
          >
            <span className="text-[9px] text-amber-400 block font-mono font-bold">2. {lang === 'marathi' ? 'पचन' : (lang === 'hinglish' ? 'Digestion' : 'Gastric')}</span>
            <span className="text-[11px] text-slate-200 font-semibold truncate block">Stomach Breakdown</span>
          </button>

          <button
            onClick={() => jumpToStage(3)}
            className="p-1.5 rounded-lg text-left border transition bg-slate-900/80 border-slate-800 hover:border-rose-500"
          >
            <span className="text-[9px] text-rose-400 block font-mono font-bold">3. {lang === 'marathi' ? 'रक्ताभिसरण' : (lang === 'hinglish' ? 'Circulation' : 'Vascular')}</span>
            <span className="text-[11px] text-slate-200 font-semibold truncate block">Heart & Liver Flow</span>
          </button>

          <button
            onClick={() => jumpToStage(4)}
            className="p-1.5 rounded-lg text-left border transition bg-slate-900/80 border-slate-800 hover:border-emerald-500"
          >
            <span className="text-[9px] text-emerald-400 block font-mono font-bold">4. {lang === 'marathi' ? 'लक्ष्य परिणाम' : (lang === 'hinglish' ? 'Target Asar' : 'Target')}</span>
            <span className="text-[11px] text-slate-200 font-semibold truncate block">Cellular Binding</span>
          </button>
        </div>

        {/* ROW 3: ORGAN SELECTORS WITH DEEP SCAN LAUNCHER */}
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          <span className="text-[10px] text-slate-400 uppercase font-bold mr-1">
            {lang === 'marathi' ? 'अवयव:' : (lang === 'hinglish' ? 'Organs:' : 'Inspect:')}
          </span>
          {Object.entries(ORGAN_DEFINITIONS).map(([key, def]) => {
            const isTarget = activeKeys.some(k => k.includes(key));
            const isFocused = focusedOrgan === key;
            const isSelected = selectedOrgan === key;

            return (
              <button
                key={key}
                onClick={() => setSelectedOrgan(selectedOrgan === key ? null : key)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 ${
                  isSelected || isFocused
                    ? 'bg-white text-slate-950 border-white shadow-md'
                    : isTarget
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 animate-pulse'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: `#${def.color.toString(16).padStart(6, '0')}` }}
                ></span>
                <span>{def.shortName}</span>
                {isTarget && <span className="text-[8px] bg-cyan-400 text-slate-950 px-1 rounded-sm">Target</span>}
              </button>
            );
          })}
        </div>

        {/* ROW 4: EXPANDED CLINICAL ORGAN INSPECTOR MODAL */}
        {selectedOrgan && ORGAN_DEFINITIONS[selectedOrgan] && (
          <div className="p-2.5 bg-slate-900/95 border border-cyan-500/50 rounded-xl text-xs space-y-1.5 animate-in fade-in slide-in-from-bottom-2 shadow-2xl">
            <div className="flex items-center justify-between font-bold text-white">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Info size={13} className="text-cyan-400" />
                {ORGAN_DEFINITIONS[selectedOrgan].name}
              </span>
              <div className="flex items-center gap-1.5">
                {/* 3D Deep Scan Trigger */}
                <button
                  onClick={() => setFocusedOrgan(focusedOrgan === selectedOrgan ? null : selectedOrgan)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition ${
                    focusedOrgan === selectedOrgan
                      ? 'bg-rose-500 hover:bg-rose-400 text-white'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md'
                  }`}
                >
                  <Scan size={11} />
                  <span>
                    {focusedOrgan === selectedOrgan
                      ? (lang === 'marathi' ? 'बाहेर पडा' : 'Exit Deep Scan')
                      : (lang === 'marathi' ? '🔬 3D अवयव तपासणी (Deep Scan)' : '🔬 3D Organ Deep Scan')}
                  </span>
                </button>

                <button
                  onClick={() => setSelectedOrgan(null)}
                  className="text-slate-400 hover:text-white text-xs px-1"
                >
                  ✕
                </button>
              </div>
            </div>

            <p className="text-slate-300 text-[11px] leading-relaxed">
              {ORGAN_DEFINITIONS[selectedOrgan].description}
            </p>

            <div className="pt-1 flex items-center justify-between border-t border-slate-800 text-[10px] text-slate-400">
              <span className="font-mono text-cyan-400 flex items-center gap-1">
                <Activity size={10} />
                {ORGAN_DEFINITIONS[selectedOrgan].clinicalTarget}
              </span>
              <span className="text-slate-500">
                Drag to rotate 360° • Scroll to zoom
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { translations, getTranslation } from '../utils/translations';
import { Languages } from 'lucide-react';

const LanguageContext = createContext();

// Known prefix patterns for dynamic strings (e.g. "Welcome back, Dr. Sharma", "Health Issue: Gastritis")
const prefixTranslations = [
  { prefix: "Welcome back, ", translations: { hinglish: "Swagat hai wapas, ", marathi: "पुन्हा स्वागत आहे, ", hindi: "पुनः स्वागत है, " } },
  { prefix: "Welcome, ", translations: { hinglish: "Swagat hai, ", marathi: "स्वागत आहे, ", hindi: "स्वागत है, " } },
  { prefix: "Health Issue: ", translations: { hinglish: "Health Takleef: ", marathi: "आरोग्य समस्या: ", hindi: "स्वास्थ्य समस्या: " } },
  { prefix: "Phone ID: ", translations: { hinglish: "Phone ID: ", marathi: "फोन आयडी: ", hindi: "फोन आईडी: " } },
  { prefix: "Age: ", translations: { hinglish: "Umar: ", marathi: "वय: ", hindi: "आयु: " } },
  { prefix: "Doctor: ", translations: { hinglish: "Doctor: ", marathi: "डॉक्टर: ", hindi: "डॉक्टर: " } },
  { prefix: "Patient: ", translations: { hinglish: "Patient: ", marathi: "रुग्ण: ", hindi: "मरीज: " } },
  { prefix: "Allergies: ", translations: { hinglish: "Allergies: ", marathi: "ऍलर्जी: ", hindi: "एलर्जी: " } },
  { prefix: "Target: ", translations: { hinglish: "Target: ", marathi: "लक्ष्य: ", hindi: "लक्ष्य: " } },
  { prefix: "DDI Status: ", translations: { hinglish: "DDI Status: ", marathi: "DDI स्थिती: ", hindi: "DDI स्थिति: " } },
  { prefix: "Allergy Screen: ", translations: { hinglish: "Allergy Screen: ", marathi: "ऍलर्जी तपासणी: ", hindi: "एलर्जी स्क्रीनिंग: " } },
  { prefix: "Acid Severity: ", translations: { hinglish: "Acid Severity: ", marathi: "ॲसिडिटी तीव्रता: ", hindi: "एसिडिटी गंभीरता: " } },
  { prefix: "Status: ", translations: { hinglish: "Status: ", marathi: "स्थिती: ", hindi: "स्थिति: " } },
  { prefix: "Monthly Cost: ", translations: { hinglish: "Mahine ka Kharcha: ", marathi: "मासिक खर्च: ", hindi: "मासिक खर्च: " } },
  { prefix: "⚠ Allergies: ", translations: { hinglish: "⚠ Allergies: ", marathi: "⚠ ऍलर्जी: ", hindi: "⚠ एलर्जी: " } }
];

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('drugai_lang') || 'english';
  });

  const modifiedNodesRef = useRef(new Set());
  const modifiedAttrsRef = useRef(new Set());
  const isTranslatingRef = useRef(false);

  useEffect(() => {
    localStorage.setItem('drugai_lang', lang);
  }, [lang]);

  // Direct translator helper
  const t = (keyOrText, defaultText) => {
    const res = getTranslation(lang, keyOrText);
    if (res && res !== keyOrText) return res;
    if (defaultText) return defaultText;
    return res || keyOrText;
  };

  // Automated live DOM translation engine
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let animFrameId = null;

    // Helper: translate a single string
    const resolveString = (text, targetLang) => {
      if (!text || typeof text !== 'string') return text;
      const trimmed = text.trim();
      if (!trimmed || trimmed.length <= 1) return text;

      // 1. Exact match in catalog
      const direct = getTranslation(targetLang, trimmed);
      if (direct && direct !== trimmed) return direct;

      // 2. Check prefix matches (e.g. "Welcome back, {Name}")
      for (const item of prefixTranslations) {
        if (trimmed.startsWith(item.prefix)) {
          const rest = trimmed.slice(item.prefix.length);
          const translatedPrefix = item.translations[targetLang] || item.prefix;
          return translatedPrefix + rest;
        }
      }

      return null;
    };

    // Restore all elements to original English
    const restoreOriginals = () => {
      isTranslatingRef.current = true;
      try {
        modifiedNodesRef.current.forEach((node) => {
          if (node && node.__origText !== undefined) {
            node.nodeValue = node.__origText;
          }
        });
        modifiedAttrsRef.current.forEach(({ el, attr, orig }) => {
          if (el && orig !== undefined) {
            el.setAttribute(attr, orig);
          }
        });
      } finally {
        isTranslatingRef.current = false;
      }
    };

    // Apply translations across DOM
    const applyDomTranslations = () => {
      if (isTranslatingRef.current) return;
      if (lang === 'english') {
        restoreOriginals();
        return;
      }

      isTranslatingRef.current = true;
      try {
        const root = document.body;
        if (!root) return;

        // TreeWalker for text nodes
        const walker = document.createTreeWalker(
          root,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => {
              const parent = node.parentElement;
              if (!parent) return NodeFilter.FILTER_REJECT;
              const tag = parent.tagName;
              if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
                return NodeFilter.FILTER_REJECT;
              }
              // Skip user-editable inputs/textareas
              if (tag === 'TEXTAREA' || (tag === 'INPUT' && !['button', 'submit'].includes(parent.type))) {
                return NodeFilter.FILTER_REJECT;
              }
              return NodeFilter.FILTER_ACCEPT;
            }
          }
        );

        let currentNode;
        while ((currentNode = walker.nextNode())) {
          if (currentNode.__origText === undefined) {
            currentNode.__origText = currentNode.nodeValue;
          }
          const orig = currentNode.__origText;
          if (!orig || !orig.trim()) continue;

          // Preserve exact whitespace
          const leading = orig.match(/^\s*/)[0];
          const trailing = orig.match(/\s*$/)[0];
          const coreText = orig.slice(leading.length, orig.length - trailing.length);

          const translatedCore = resolveString(coreText, lang);
          if (translatedCore && translatedCore !== coreText) {
            const finalVal = leading + translatedCore + trailing;
            if (currentNode.nodeValue !== finalVal) {
              currentNode.nodeValue = finalVal;
              modifiedNodesRef.current.add(currentNode);
            }
          }
        }

        // Translate placeholders & titles
        const elementsWithAttrs = root.querySelectorAll('[placeholder], [title]');
        elementsWithAttrs.forEach((el) => {
          if (el.hasAttribute('placeholder')) {
            if (el.__origPlaceholder === undefined) {
              el.__origPlaceholder = el.getAttribute('placeholder');
            }
            const orig = el.__origPlaceholder;
            const trans = resolveString(orig, lang);
            if (trans && trans !== orig && el.getAttribute('placeholder') !== trans) {
              el.setAttribute('placeholder', trans);
              modifiedAttrsRef.current.add({ el, attr: 'placeholder', orig });
            }
          }

          if (el.hasAttribute('title')) {
            if (el.__origTitle === undefined) {
              el.__origTitle = el.getAttribute('title');
            }
            const orig = el.__origTitle;
            const trans = resolveString(orig, lang);
            if (trans && trans !== orig && el.getAttribute('title') !== trans) {
              el.setAttribute('title', trans);
              modifiedAttrsRef.current.add({ el, attr: 'title', orig });
            }
          }
        });
      } finally {
        isTranslatingRef.current = false;
      }
    };

    // Run initial pass
    applyDomTranslations();

    // Listen to React DOM mutations
    const observer = new MutationObserver(() => {
      if (isTranslatingRef.current) return;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      animFrameId = requestAnimationFrame(() => {
        applyDomTranslations();
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    return () => {
      observer.disconnect();
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, translations: translations[lang] || translations.english }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Global Reusable Language Selector Pill Component
export function LanguageSelector({ className = '' }) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={`flex items-center bg-white/90 backdrop-blur-md p-1 rounded-2xl border border-slate-200/90 shadow-xs text-xs ${className}`}>
      <div className="flex items-center gap-1.5 px-2 py-0.5 text-slate-500 font-semibold text-[11px]">
        <Languages size={14} className="text-[#0284c7]" />
        <span className="hidden sm:inline">Lang:</span>
      </div>
      <button
        type="button"
        onClick={() => setLang('english')}
        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
          lang === 'english'
            ? 'bg-[#0284c7] text-white shadow-sm shadow-sky-500/20'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('hinglish')}
        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
          lang === 'hinglish'
            ? 'bg-[#0284c7] text-white shadow-sm shadow-sky-500/20'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        Hinglish
      </button>
      <button
        type="button"
        onClick={() => setLang('marathi')}
        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
          lang === 'marathi'
            ? 'bg-[#0284c7] text-white shadow-sm shadow-sky-500/20'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        मराठी
      </button>
      <button
        type="button"
        onClick={() => setLang('hindi')}
        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
          lang === 'hindi'
            ? 'bg-[#0284c7] text-white shadow-sm shadow-sky-500/20'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        हिन्दी
      </button>
    </div>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      lang: 'english',
      setLang: () => {},
      t: (keyOrText, defaultText) => getTranslation('english', keyOrText) || defaultText || keyOrText,
      translations: translations.english
    };
  }
  return context;
}

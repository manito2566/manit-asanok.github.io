// i18n.js — minimal language switcher with localStorage persistence
// Usage: data-i18n="path.to.key" attribute on any element; init() replaces textContent.
//        data-i18n-placeholder for input placeholders.
//        For dual-key text in JSON (e.g. {th:"...", en:"..."}) use window.i18n.pick(obj).

(function () {
  const STORAGE_KEY = 'mportfolio.lang';
  const SUPPORTED = ['th', 'en'];
  const DEFAULT = 'th';

  function getInitialLang() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.includes(stored)) return stored;
    const nav = (navigator.language || 'en').toLowerCase();
    if (nav.startsWith('th')) return 'th';
    return DEFAULT;
  }

  const state = {
    lang: getInitialLang(),
    dict: {},
    profile: null
  };

  async function loadDict(lang) {
    const res = await fetch(`locales/${lang}.json`);
    if (!res.ok) throw new Error(`Failed to load ${lang}.json`);
    return res.json();
  }

  function getByPath(obj, path) {
    return path.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : null), obj);
  }

  function pick(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && (value.th || value.en)) {
      return value[state.lang] || value.en || value.th || '';
    }
    return String(value);
  }

  function applyTranslations(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const val = getByPath(state.dict, key);
      if (val != null) el.textContent = val;
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const val = getByPath(state.dict, key);
      if (val != null) el.setAttribute('placeholder', val);
    });
    document.documentElement.setAttribute('lang', state.lang);
  }

  async function setLang(lang) {
    if (!SUPPORTED.includes(lang)) return;
    state.lang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    state.dict = await loadDict(lang);
    applyTranslations();
    document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang } }));
  }

  function bindToggle() {
    document.querySelectorAll('[data-i18n-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = state.lang === 'th' ? 'en' : 'th';
        setLang(next);
      });
    });
    document.querySelectorAll('[data-i18n-set]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setLang(btn.getAttribute('data-i18n-set'));
      });
    });
  }

  async function init() {
    state.dict = await loadDict(state.lang);
    applyTranslations();
    bindToggle();
  }

  window.i18n = {
    init,
    setLang,
    pick,
    apply: applyTranslations,
    get lang() { return state.lang; },
    get dict() { return state.dict; },
    t(path) { return getByPath(state.dict, path); }
  };
})();

// publications.js — Alpine component for filter + search

function pubsApp() {
  return {
    all: [],
    lang: (document.documentElement.lang || 'th'),
    query: '',
    activeType: 'all',
    activeYear: 'all',
    types: [
      { key: 'all', label: { th: 'ทั้งหมด', en: 'All' } },
      { key: 'international', label: { th: 'นานาชาติ (Scopus)', en: 'International' } },
      { key: 'national', label: { th: 'TCI', en: 'National (TCI)' } },
      { key: 'conference', label: { th: 'ประชุมวิชาการ', en: 'Conference' } },
      { key: 'academic', label: { th: 'บทความวิชาการ', en: 'Academic Article' } },
      { key: 'book', label: { th: 'หนังสือ/ตำรา', en: 'Book' } }
    ],

    async init() {
      const res = await fetch('data/publications.json');
      this.all = await res.json();
      // sort newest first
      this.all.sort((a, b) => b.year - a.year);
      // react to language change
      document.addEventListener('i18n:changed', (e) => { this.lang = e.detail.lang; });
    },

    get years() {
      return [...new Set(this.all.map(p => p.year))].sort((a, b) => b - a);
    },

    countByType(key) {
      if (key === 'all') return this.all.length;
      return this.all.filter(p => p.type === key).length;
    },

    pickTitle(p) {
      if (!p.title) return '';
      return p.title[this.lang] || p.title.en || p.title.th || '';
    },

    renderCitation(p) {
      const authors = (p.authors || []).join(', ');
      const venue = p.venue || '';
      const vol = p.volume ? `, ${p.volume}` : '';
      const iss = p.issue ? `(${p.issue})` : '';
      const pages = p.pages ? `, ${p.pages}` : '';
      return `${authors} (${p.year}). <em>${venue}</em>${vol}${iss}${pages}.`;
    },

    badgeClass(type) {
      return ({
        international: 'badge-scopus',
        national: 'badge-tci',
        conference: 'badge-conf',
        academic: 'badge-academic',
        book: 'badge-book'
      })[type] || 'badge-tci';
    },

    badgeLabel(type) {
      return ({
        international: 'Scopus',
        national: 'TCI',
        conference: 'Conference',
        academic: 'Academic',
        book: 'Book'
      })[type] || type;
    },

    get filtered() {
      const q = (this.query || '').trim().toLowerCase();
      return this.all.filter(p => {
        if (this.activeType !== 'all' && p.type !== this.activeType) return false;
        if (this.activeYear !== 'all' && String(p.year) !== String(this.activeYear)) return false;
        if (q) {
          const hay = [
            this.pickTitle(p),
            (p.title && p.title.en) || '',
            (p.title && p.title.th) || '',
            (p.authors || []).join(' '),
            p.venue || ''
          ].join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    }
  };
}
window.pubsApp = pubsApp;

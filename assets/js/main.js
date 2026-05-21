// main.js — shared utilities + header/footer rendering + profile loading

async function loadProfile() {
  if (window.__profile) return window.__profile;
  const res = await fetch('data/profile.json');
  window.__profile = await res.json();
  return window.__profile;
}

function activeNav() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach((a) => {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) a.classList.add('active');
  });
}

async function renderFooter() {
  const profile = await loadProfile();
  const el = document.getElementById('site-footer');
  if (!el) return;
  const year = new Date().getFullYear();
  const address = window.i18n.pick(profile.contact.address);
  const dept = window.i18n.pick(profile.department);
  const name = window.i18n.pick(profile.shortName);

  el.innerHTML = `
    <div class="container-narrow py-12">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 class="text-lg font-bold mb-3" style="color:#fff">${name}</h3>
          <p class="text-sm" style="color:#cbd5e1">${dept}</p>
        </div>
        <div>
          <h4 class="text-sm font-semibold uppercase mb-3" style="color:#fff;letter-spacing:0.08em">Contact</h4>
          <p class="text-sm leading-relaxed" style="color:#cbd5e1">${address}</p>
          <p class="text-sm mt-2" style="color:#cbd5e1">${profile.contact.phone}</p>
        </div>
        <div>
          <h4 class="text-sm font-semibold uppercase mb-3" style="color:#fff;letter-spacing:0.08em">Academic Profiles</h4>
          <div class="flex flex-col gap-2 text-sm">
            <a href="${profile.identifiers.scopusUrl}" target="_blank" rel="noopener" style="color:#cbd5e1" class="hover:text-white">Scopus: ${profile.identifiers.scopusId}</a>
            <a href="${profile.identifiers.orcidUrl}" target="_blank" rel="noopener" style="color:#cbd5e1" class="hover:text-white">ORCID: ${profile.identifiers.orcid}</a>
            <a href="${profile.identifiers.adScientificUrl}" target="_blank" rel="noopener" style="color:#cbd5e1" class="hover:text-white">AD Scientific Index</a>
          </div>
        </div>
      </div>
      <div class="border-t mt-8 pt-6 flex flex-col md:flex-row justify-between items-center text-xs" style="border-color:#334155;color:#94a3b8">
        <p>&copy; ${year} ${name}. <span data-i18n="footer.copyright">All rights reserved</span></p>
        <p class="mt-2 md:mt-0"><span data-i18n="footer.lastUpdate">Last updated</span>: 2026-05-21</p>
      </div>
    </div>
  `;
  // Re-apply translations to the freshly injected footer
  if (window.i18n && window.i18n.apply) window.i18n.apply(el);
  if (window.lucide) window.lucide.createIcons();
}

// Mobile menu toggle
function bindMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => menu.classList.toggle('hidden'));
}

// Smooth-scroll for in-page anchors
function bindAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  if (window.i18n) await window.i18n.init();
  activeNav();
  bindMobileMenu();
  bindAnchors();
  renderFooter();
});

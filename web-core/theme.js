(function () {
  const root = document.documentElement;
  const saved = localStorage.getItem('accad-theme');
  if (saved === 'dark' || saved === 'light') root.dataset.theme = saved;
  function update(button) { const dark = root.dataset.theme === 'dark'; button.textContent = dark ? '☀' : '◐'; button.title = dark ? 'Activer le mode clair' : 'Activer le mode sombre'; button.setAttribute('aria-label', button.title); }
  function mount() { const host = document.querySelector('.top-actions') || document.querySelector('header .brand') || document.querySelector('header'); if (!host || document.querySelector('#theme-toggle')) return; const button = document.createElement('button'); button.id = 'theme-toggle'; button.className = 'theme-toggle'; button.type = 'button'; button.addEventListener('click', () => { root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('accad-theme', root.dataset.theme); update(button); }); host.appendChild(button); update(button); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();

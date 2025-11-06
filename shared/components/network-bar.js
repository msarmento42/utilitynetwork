// /shared/components/network-bar.js
// Lightweight network nav. Include via <script src="/shared/components/network-bar.js" defer></script>
(() => {
  const CANDIDATES = [
    '/shared/assets/network.json',
    './shared/assets/network.json',
    '../shared/assets/network.json',
    '../../shared/assets/network.json'
  ];
  async function loadConfig() {
    for (const u of CANDIDATES) {
      try {
        const r = await fetch(u, { cache: 'no-store' });
        if (r.ok) return r.json();
      } catch {}
    }
    return [];
  }
  function render(items) {
    if (!items.length) return;
    const bar = document.createElement('nav');
    bar.setAttribute('aria-label','Utility Network');
    bar.style.cssText = 'display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;padding:.5rem 1rem;background:#f6f6f7;border-bottom:1px solid #e5e7eb;font:600 14px/1.2 system-ui,-apple-system,Segoe UI,Roboto';
    const label = document.createElement('span');
    label.textContent = 'Utility Network:';
    label.style.cssText = 'opacity:.7;margin-right:.25rem';
    bar.appendChild(label);
    items.forEach(i => {
      const a = document.createElement('a');
      a.href = i.href;
      a.textContent = i.label;
      a.style.cssText = 'text-decoration:none;padding:.25rem .5rem;border-radius:.375rem;border:1px solid #e5e7eb';
      a.onmouseenter = () => a.style.background = '#fff';
      a.onmouseleave = () => a.style.background = '';
      bar.appendChild(a);
    });
    document.body.prepend(bar);
  }
  loadConfig().then(render);
})();

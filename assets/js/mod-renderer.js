/* ============================================================
   Block Foundry — mod-renderer.js
   ------------------------------------------------------------
   Loaded by every /mod/N.html wrapper.
   Auto-detects the mod ID from the URL filename (e.g., 0.html -> 0).

   Fetches:
     /mod/tmp.html   — shared template
     /mod/mods.json  — data source

   Injects the merged HTML into <div id="app">, then updates
   <title>, <meta name="description">, and Open Graph tags.
   ============================================================ */

(function () {
  'use strict';

  // ------------------------------------------------------------
  // 1. AUTO-DETECT MOD ID FROM URL
  // ------------------------------------------------------------
  var path = window.location.pathname;
  var filename = path.substring(path.lastIndexOf('/') + 1); 
  var idStr = filename.replace('.html', '');               
  var MOD_ID = parseInt(idStr, 10);                        

  // Ignore execution if the template is opened directly
  if (filename === 'tmp.html') return; 

  var FETCH_TIMEOUT = 12000; // ms

  /* ---------- HELPERS ---------- */

  function escapeHTML(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDescription(value) {
    return escapeHTML(value).replace(/\r?\n/g, '<br>');
  }

  function safeUrl(value, fallback) {
    if (!value) return fallback || '#';
    try {
      var url = new URL(value, window.location.origin);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.href;
      }
    } catch (e) { /* ignore */ }
    return fallback || '#';
  }

  function setMeta(selector, content) {
    if (!content) return;
    var el = document.querySelector(selector);
    if (el) el.setAttribute('content', content);
  }

  function fetchWithTimeout(url, ms) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, ms);
    return fetch(url, { signal: controller.signal, cache: 'no-cache' })
      .finally(function () { clearTimeout(timer); });
  }

  function showError(title, message) {
    document.title = title + ' — Block Foundry';
    var app = document.getElementById('app');
    if (!app) return;
    app.innerHTML =
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;' +
      'background:#0a0a0a;color:#e5e5e5;font-family:system-ui,sans-serif;padding:24px;text-align:center">' +
        '<div>' +
          '<h1 style="font-size:56px;margin:0 0 12px;color:#facc15;font-weight:800">' + escapeHTML(title) + '</h1>' +
          '<p style="margin:0 0 24px;color:#9ca3af;max-width:420px">' + escapeHTML(message) + '</p>' +
          '<a href="/" style="display:inline-block;background:#facc15;color:#0a0a0a;' +
          'text-decoration:none;font-weight:700;padding:12px 24px;border-radius:8px">' +
          '← Back to Home</a>' +
        '</div>' +
      '</div>';
  }

  /* ---------- GUARD ---------- */

  if (isNaN(MOD_ID)) {
    showError('404', 'Invalid mod identifier.');
    return;
  }

  /* ---------- MAIN ---------- */

  Promise.all([
    fetchWithTimeout('/mod/tmp.html', FETCH_TIMEOUT).then(function (res) {
      if (!res.ok) throw new Error('Template load failed (' + res.status + ')');
      return res.text();
    }),
    fetchWithTimeout('/mod/mods.json', FETCH_TIMEOUT).then(function (res) {
      if (!res.ok) throw new Error('mods.json load failed (' + res.status + ')');
      return res.json();
    })
  ])
  .then(function (results) {
    var template = results[0];
    var data     = results[1];

    var mods = (data && Array.isArray(data.mods)) ? data.mods : [];
    var mod  = mods.find(function (m) { return m && m.id === MOD_ID; });

    if (!mod) {
      showError('Not Found', 'Mod #' + MOD_ID + ' could not be found on Block Foundry.');
      return;
    }

    // Process screenshots array into HTML img tags
    var screenshotsHtml = '';
    if (Array.isArray(mod.screenshots) && mod.screenshots.length > 0) {
      screenshotsHtml = mod.screenshots.map(function (src) {
        return '<img class="gallery-img" src="' + safeUrl(src, '') + '" alt="' + escapeHTML(mod.name) + ' screenshot" loading="lazy">';
      }).join('');
    }

    // Build final HTML
    var html = template
      .replace(/\{\{name\}\}/g,        escapeHTML(mod.name || 'Untitled Mod'))
      .replace(/\{\{description\}\}/g, formatDescription(mod.description || ''))
      .replace(/\{\{thumbnail\}\}/g,   safeUrl(mod.thumbnail, '/content/images/placeholder.png'))
      .replace(/\{\{category\}\}/g,    escapeHTML(mod.category || 'unknown'))
      .replace(/\{\{type\}\}/g,        escapeHTML(mod.type || 'unknown'))
      .replace(/\{\{version\}\}/g,     escapeHTML(mod.version || '—'))
      .replace(/\{\{mcVersion\}\}/g,   escapeHTML(mod.mcVersion || '—'))
      .replace(/\{\{downloadUrl\}\}/g, safeUrl(mod.downloadUrl, '#'))
      .replace(/\{\{screenshots\}\}/g, screenshotsHtml);

    var app = document.getElementById('app');
    if (!app) {
      console.error('[mod-renderer] Missing #app container');
      return;
    }
    app.innerHTML = html;

    /* ---------- SEO UPDATES ---------- */
    var pageTitle = (mod.name || 'Mod') + ' — Block Foundry';
    var rawDesc   = (mod.description || '').replace(/\s+/g, ' ').trim();
    var pageDesc  = rawDesc.slice(0, 158) + (rawDesc.length > 158 ? '…' : '');
    var ogImage   = mod.thumbnail ? safeUrl(mod.thumbnail, '') : '';

    document.title = pageTitle;
    setMeta('meta[name="description"]', pageDesc);
    setMeta('meta[property="og:title"]', pageTitle);
    setMeta('meta[property="og:description"]', pageDesc);
    setMeta('meta[property="og:image"]', ogImage);
    setMeta('meta[name="twitter:title"]', pageTitle);
    setMeta('meta[name="twitter:description"]', pageDesc);
    setMeta('meta[name="twitter:image"]', ogImage);

    document.body.setAttribute('data-mod-rendered', 'true');
  })
  .catch(function (err) {
    console.error('[mod-renderer]', err);
    var msg = err && err.name === 'AbortError'
      ? 'Request timed out. Please check your connection and reload.'
      : 'Could not load mod data. Please try again later.';
    showError('Error', msg);
  });
})();
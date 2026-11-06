/* ============================================================
   Block Foundry — main.js
   ------------------------------------------------------------
   Runs only on index.html.

   Responsibilities:
     - Fetch /mod/mods.json
     - Render one card per mod into #mods-grid
     - Each card links to /mod/{id}.html
     - Show empty state if mods.json has zero mods
     - Show error state if fetch fails
   ============================================================ */

(function () {
  'use strict';

  var grid       = document.getElementById('mods-grid');
  var countLabel = document.getElementById('mods-count');
  if (!grid) return;

  /* ---------- helpers ---------- */

  function escapeHTML(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeUrl(value, fallback) {
    if (!value) return fallback;
    try {
      var url = new URL(value, window.location.origin);
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
    } catch (e) { /* ignore */ }
    return fallback;
  }

  /* ---------- card template ---------- */

  function renderCard(mod) {
    var id     = Number(mod && mod.id);
    
    // ALLOWS ID 0 BUT BLOCKS NEGATIVE IDS
    if (!isFinite(id) || id < 0) return '';

    var name   = escapeHTML(mod.name || 'Untitled Mod');
    var desc   = escapeHTML(mod.description || '');
    var thumb  = safeUrl(mod.thumbnail, '/content/images/placeholder.png');
    var cat    = escapeHTML(mod.category || 'mod');
    var type   = escapeHTML(mod.type || '—');
    var ver    = escapeHTML(mod.version || '—');
    var mcVer  = escapeHTML(mod.mcVersion || '—');
    var href   = '/mod/' + id + '.html';

    return (
      '<a class="bf-card" href="' + href + '" aria-label="View ' + name + '">' +
        '<div class="bf-card-thumb">' +
          '<img src="' + thumb + '" alt="' + name + '" loading="lazy" width="640" height="360">' +
          '<span class="bf-card-badge">' + cat + '</span>' +
        '</div>' +
        '<div class="bf-card-body">' +
          '<h3 class="bf-card-title">' + name + '</h3>' +
          '<p class="bf-card-desc">' + desc + '</p>' +
          '<div class="bf-card-meta">' +
            '<span>' + type + '</span>' +
            '<span>v' + ver + '</span>' +
            '<span>MC ' + mcVer + '</span>' +
          '</div>' +
        '</div>' +
      '</a>'
    );
  }

  /* ---------- states ---------- */

  function showEmpty() {
    if (countLabel) countLabel.textContent = '';
    grid.innerHTML =
      '<div class="bf-state">' +
        '<p class="bf-state-title">No mods yet</p>' +
        '<p>New mods are on the way. Check back soon!</p>' +
      '</div>';
  }

  function showError(msg) {
    if (countLabel) countLabel.textContent = '';
    grid.innerHTML =
      '<div class="bf-state">' +
        '<p class="bf-state-title">Could not load mods</p>' +
        '<p>' + escapeHTML(msg) + '</p>' +
      '</div>';
  }

  /* ---------- main ---------- */

  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, 12000);

  fetch('/mod/mods.json', { signal: controller.signal, cache: 'no-cache' })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      clearTimeout(timer);
      var mods = (data && Array.isArray(data.mods)) ? data.mods : [];

      if (mods.length === 0) {
        showEmpty();
        return;
      }

      var cards = mods.map(renderCard).filter(Boolean).join('');
      grid.innerHTML = cards;

      if (countLabel) {
        countLabel.textContent = mods.length + (mods.length === 1 ? ' mod' : ' mods');
      }
    })
    .catch(function (err) {
      clearTimeout(timer);
      console.error('[main.js]', err);
      if (err && err.name === 'AbortError') {
        showError('Request timed out. Please check your connection.');
      } else {
        showError('Please try again later.');
      }
    });
})();
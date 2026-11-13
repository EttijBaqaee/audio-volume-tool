/* SPDX-License-Identifier: AGPL-3.0-only */
(function () {
  'use strict';
  const storageKey = 'audio-volume-theme-mode';
  const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const normalize = value => value === 'light' || value === 'dark' ? value : 'auto';
  let mode = 'auto';
  // The previous two-state preference must not silently disable the new default.
  try { mode = normalize(localStorage.getItem(storageKey)); } catch (error) {}
  function apply() {
    document.documentElement.dataset.theme = mode === 'auto' ? (media && media.matches ? 'dark' : 'light') : mode;
    document.documentElement.dataset.themeMode = mode;
    const control = document.getElementById('theme-mode');
    if (control) control.value = mode;
  }
  document.addEventListener('change', event => {
    if (event.target.id !== 'theme-mode') return;
    mode = normalize(event.target.value);
    try { localStorage.setItem(storageKey, mode); localStorage.removeItem('audio-volume-theme'); } catch (error) {}
    apply();
  });
  const followPreference = () => { if (mode === 'auto') apply(); };
  if (media) {
    if (typeof media.addEventListener === 'function') media.addEventListener('change', followPreference);
    else if (typeof media.addListener === 'function') media.addListener(followPreference);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  apply();
})();

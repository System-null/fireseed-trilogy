/*! fireseed-i18n baseline shim v1.0 */
(function () {
  try {
    const W = window;
    W.__i18nState = W.__i18nState || {};
    const S = W.__i18nState;
    if (S.baseline && typeof S.baseline.keys === 'function') {
      console.debug('[i18n-baseline-shim] baseline exists');
      return;
    }
    const nodes = Array.from(document.querySelectorAll([
      'h1','h2','h3','h4','label','button','small','p','li',
      '.card h3','.card p','.card small','.muted',
      'option','[placeholder]','[title]','[data-i18n]'
    ].join(',')));
    const map = new Map();
    nodes.forEach((el, i) => {
      const entry = {
        el,
        text: (el.childElementCount ? el.textContent : (el.innerText || '')).trim(),
        placeholder: el.getAttribute && el.getAttribute('placeholder') || null,
        title: el.getAttribute && el.getAttribute('title') || null,
        key: el.dataset && el.dataset.i18n || null,
        placeholderKey: el.dataset && el.dataset.i18nPlaceholder || null,
        titleKey: el.dataset && el.dataset.i18nTitle || null
      };
      map.set(i, entry);
    });
    S.baseline = map;
    console.log('[i18n-baseline-shim] baseline snapshot ok (%d nodes)', map.size);
  } catch (e) {
    console.error('[i18n-baseline-shim] failed:', e);
  }
})();
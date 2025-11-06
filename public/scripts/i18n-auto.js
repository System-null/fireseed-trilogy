console.log('🌐 i18n-auto.js initialized');

async function loadLanguage(lang) {
  try {
    const res = await fetch(`./lang/${lang}.json`);
    const dict = await res.json();
    for (const [key, value] of Object.entries(dict)) {
      document.body.innerHTML = document.body.innerHTML.replaceAll(key, value);
    }
    console.log(`✅ Loaded language: ${lang}`);
  } catch (err) {
    console.error('❌ i18n load failed', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const select = document.querySelector('select[name="language"]');
  if (select) {
    select.addEventListener('change', e => loadLanguage(e.target.value));
  }
  console.log('✅ i18n ready');
});
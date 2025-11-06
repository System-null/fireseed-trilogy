async function setLanguage(lang) {
  try {
    const res = await fetch(`./lang/${lang}.json`);
    const dict = await res.json();
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if (dict[key]) el.innerText = dict[key];
    });
    localStorage.setItem("lang", lang);
  } catch (err) {
    console.error("Language load failed:", lang, err);
  }
}

function initLanguage() {
  const saved = localStorage.getItem("lang") || navigator.language.slice(0,2) || "zh";
  setLanguage(saved);
  const selector = document.getElementById("language");
  if (selector) {
    selector.value = saved;
    selector.addEventListener("change", (e) => setLanguage(e.target.value));
  }
}

document.addEventListener("DOMContentLoaded", initLanguage);

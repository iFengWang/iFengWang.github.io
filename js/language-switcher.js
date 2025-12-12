// Real-time Translation System using Google Translate API
(function () {
  "use strict";

  // Language configuration
  const languages = {
    zh: { name: "中文", code: "zh-CN", flag: "🇨🇳" },
    en: { name: "English", code: "en", flag: "🇺🇸" },
    ja: { name: "日本語", code: "ja", flag: "🇯🇵" },
  };

  // Current language state
  let currentLanguage = localStorage.getItem("selectedLanguage") || "zh";
  let isTranslating = false;
  let isPageRefresh = false;

  // Initialize the language switcher
  function initLanguageSwitcher() {
    const toggle = document.getElementById("languageToggle");
    const menu = document.getElementById("languageMenu");
    const currentLang = document.getElementById("currentLang");

    if (!toggle || !menu || !currentLang) {
      console.log("Language switcher elements not found");
      return;
    }

    // Set current language display (use flag instead of name)
    currentLang.textContent = languages[currentLanguage].flag;

    // Toggle dropdown
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      menu.classList.toggle("show");
      toggle.classList.toggle("active");
    });

    // Handle language selection
    const languageOptions = menu.querySelectorAll(".language-option");
    languageOptions.forEach((option) => {
      option.addEventListener("click", function (e) {
        e.preventDefault();
        const selectedLang = this.getAttribute("data-lang");

        if (selectedLang !== currentLanguage && !isTranslating) {
          currentLanguage = selectedLang;
          localStorage.setItem("selectedLanguage", currentLanguage);
          currentLang.textContent = languages[currentLanguage].flag;

          // Translate page
          translatePage(currentLanguage);

          // Update active state
          languageOptions.forEach((opt) => opt.classList.remove("active"));
          this.classList.add("active");
        }

        // Close dropdown
        menu.classList.remove("show");
        toggle.classList.remove("active");
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function (e) {
      if (!toggle.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove("show");
        toggle.classList.remove("active");
      }
    });

    // Set active language
    const activeOption = menu.querySelector(`[data-lang="${currentLanguage}"]`);
    if (activeOption) {
      activeOption.classList.add("active");
    }
  }

  // Restore original Chinese content
  function restoreOriginalContent() {
    console.log("Restoring original Chinese content");

    // Reload the page to restore original content
    // This is the simplest way to ensure we get the original Chinese content
    window.location.reload();
  }

  // Translate page using Google Translate API
  function translatePage(targetLang) {
    if (isTranslating) return;

    // If target language is Chinese, restore original content instead of translating
    if (targetLang === "zh") {
      console.log("Restoring original Chinese content");
      restoreOriginalContent();
      return;
    }

    isTranslating = true;
    console.log(`Starting translation to ${languages[targetLang].name}`);

    // Get all text elements
    const elements = document.querySelectorAll(
      "h1, h2, h3, h4, h5, h6, p, span, div, a, li, td, th"
    );
    const textElements = Array.from(elements).filter(
      (el) =>
        el.children.length === 0 &&
        el.textContent.trim() &&
        !el.querySelector("script") &&
        !el.querySelector("style")
    );

    console.log(`Found ${textElements.length} elements to translate`);

    // Translate elements in batches to avoid rate limiting
    const batchSize = 5;
    let currentBatch = 0;

    function translateBatch() {
      const start = currentBatch * batchSize;
      const end = Math.min(start + batchSize, textElements.length);
      const batch = textElements.slice(start, end);

      if (batch.length === 0) {
        isTranslating = false;
        console.log("Translation completed");
        return;
      }

      const promises = batch.map((element) =>
        translateElement(element, targetLang)
      );

      Promise.all(promises)
        .then(() => {
          currentBatch++;
          // Add small delay between batches
          setTimeout(translateBatch, 100);
        })
        .catch((error) => {
          console.error("Translation batch failed:", error);
          currentBatch++;
          setTimeout(translateBatch, 100);
        });
    }

    translateBatch();
  }

  // Translate individual element
  function translateElement(element, targetLang) {
    const text = element.textContent.trim();
    if (!text || text.length > 5000) return Promise.resolve();

    return translateText(text, targetLang)
      .then((translatedText) => {
        if (translatedText && translatedText !== text) {
          element.textContent = translatedText;
        }
      })
      .catch((error) => {
        console.log(`Translation failed for: ${text.substring(0, 50)}...`);
      });
  }

  // Translate text using Google Translate API
  function translateText(text, targetLang) {
    return new Promise((resolve, reject) => {
      // Use Google Translate's free API endpoint
      const sourceLang = detectLanguage(text);
      const targetCode = languages[targetLang].code;

      // Skip translation if source and target are the same
      if (sourceLang === targetCode) {
        resolve(text);
        return;
      }

      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetCode}&dt=t&q=${encodeURIComponent(
        text
      )}`;

      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          if (data && data[0] && data[0][0] && data[0][0][0]) {
            resolve(data[0][0][0]);
          } else {
            reject(new Error("Translation failed"));
          }
        })
        .catch((error) => {
          console.error("Google Translate API error:", error);
          reject(error);
        });
    });
  }

  // Simple language detection
  function detectLanguage(text) {
    // Check for Chinese characters
    if (/[\u4e00-\u9fff]/.test(text)) return "zh-CN";

    // Check for Japanese characters (Hiragana, Katakana, Kanji)
    if (/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text)) return "ja";

    // Default to English
    return "en";
  }

  // Handle language persistence across pages
  function handleLanguagePersistence() {
    // Check if this is a page refresh (F5 or browser refresh button)
    const navigationEntries = performance.getEntriesByType("navigation");
    const isRefresh =
      navigationEntries.length > 0 && navigationEntries[0].type === "reload";

    if (isRefresh) {
      console.log("Page refresh detected (F5), resetting to Chinese");
      currentLanguage = "zh";
      localStorage.setItem("selectedLanguage", currentLanguage);
    } else {
      console.log(
        "Page navigation detected, maintaining language:",
        currentLanguage
      );
      // Apply translation if not Chinese
      if (currentLanguage !== "zh") {
        setTimeout(() => {
          translatePage(currentLanguage);
        }, 500); // Small delay to ensure page is fully loaded
      }
    }

    // Update UI
    const currentLang = document.getElementById("currentLang");
    if (currentLang) {
      currentLang.textContent = languages[currentLanguage].flag;
    }

    // Update active option
    const activeOption = document.querySelector(
      `[data-lang="${currentLanguage}"]`
    );
    const allOptions = document.querySelectorAll(".language-option");
    allOptions.forEach((opt) => opt.classList.remove("active"));
    if (activeOption) {
      activeOption.classList.add("active");
    }
  }

  // Initialize when DOM is ready
  document.addEventListener("DOMContentLoaded", function () {
    console.log("Real-time translation system loaded");
    initLanguageSwitcher();

    // Handle language persistence across pages
    handleLanguagePersistence();
  });

  // Also initialize immediately if DOM is already loaded
  if (document.readyState === "loading") {
    // DOM is still loading, wait for DOMContentLoaded
  } else {
    // DOM is already loaded, initialize immediately
    console.log("DOM already loaded, initializing immediately");
    initLanguageSwitcher();
    handleLanguagePersistence();
  }

  // Expose functions globally for external use
  window.TranslationSystem = {
    translatePage: translatePage,
    setLanguage: function (lang) {
      currentLanguage = lang;
      localStorage.setItem("selectedLanguage", currentLanguage);
      translatePage(currentLanguage);
    },
    getCurrentLanguage: function () {
      return currentLanguage;
    },
    resetToDefault: function () {
      currentLanguage = "zh";
      localStorage.setItem("selectedLanguage", currentLanguage);
      // Update UI
      const currentLang = document.getElementById("currentLang");
      if (currentLang) {
        currentLang.textContent = languages[currentLanguage].flag;
      }
    },
  };
})();

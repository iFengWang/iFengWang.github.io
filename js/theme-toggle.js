(function() {
  'use strict';

  const THEME_KEY = 'theme-preference';
  const LIGHT_THEME = 'light';
  const DARK_THEME = 'dark';

  // 获取当前主题（默认为黑夜主题）
  function getCurrentTheme() {
    return localStorage.getItem(THEME_KEY) || DARK_THEME;
  }

  // 应用主题
  function applyTheme(theme) {
    if (theme === DARK_THEME) {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
    localStorage.setItem(THEME_KEY, theme);
  }

  // 切换主题
  function toggleTheme() {
    const currentTheme = getCurrentTheme();
    const newTheme = currentTheme === LIGHT_THEME ? DARK_THEME : LIGHT_THEME;
    applyTheme(newTheme);
  }

  // 页面加载时应用保存的主题
  document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = getCurrentTheme();
    applyTheme(savedTheme);

    // 绑定切换按钮事件
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', toggleTheme);
    }
  });

  // 在 DOM 解析前立即应用主题，避免闪烁（默认黑夜主题）
  (function() {
    const savedTheme = localStorage.getItem(THEME_KEY) || DARK_THEME;
    if (savedTheme === DARK_THEME) {
      document.documentElement.classList.add('dark-theme');
    }
  })();
})();


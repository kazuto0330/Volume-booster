// utils.js - 共通ユーティリティ関数群

/**
 * URLからプロトコル (https?://) と 'www.' を除去して正規化する
 * @param {string} url
 * @returns {string}
 */
function normalizeUrl(url) {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '');
}

/**
 * キー（ドメインまたはURLパス）が指定の正規化URLにマッチするか判定する
 * @param {string} key
 * @param {string} normalizedUrl
 * @returns {boolean}
 */
function isUrlMatch(key, normalizedUrl) {
  if (!normalizedUrl || !key) return false;
  if (!normalizedUrl.startsWith(key)) return false;
  if (normalizedUrl.length === key.length) return true;
  const nextChar = normalizedUrl[key.length];
  return ['/', '?', '#'].includes(nextChar);
}

/**
 * 保存された設定キーの中から、正規化URLに最も長く一致する（最長一致）キーを検索する
 * @param {string} normalizedUrl
 * @param {Object} settings
 * @returns {string|null}
 */
function findBestMatchingKey(normalizedUrl, settings) {
  if (!normalizedUrl || !settings) return null;
  let bestMatchKey = null;
  let maxLen = -1;

  for (const key in settings) {
    if (isUrlMatch(key, normalizedUrl)) {
      if (key.length > maxLen) {
        maxLen = key.length;
        bestMatchKey = key;
      }
    }
  }
  return bestMatchKey;
}

/**
 * 連続して呼び出される関数をデバウンス（遅延実行）する
 * @param {Function} func
 * @param {number} wait ミリ秒
 * @returns {Function}
 */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * 数値を指定範囲 [min, max] に収める
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(val, min, max) {
  const num = Number(val);
  if (isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}

/**
 * ページ全体にテーマ（ライト/ダーク）を適用する
 * @param {string} theme 'light' または 'dark'
 */
function applyTheme(theme) {
  if (document && document.body) {
    if (theme === 'dark') {
      document.body.classList.add('theme-dark');
    } else {
      document.body.classList.remove('theme-dark');
    }
  }
}

/**
 * 文字列をHTMLエスケープする
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

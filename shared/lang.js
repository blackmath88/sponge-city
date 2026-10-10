// Shared language contract for the journey and its embedded modules.
// Active language: URL ?lang=de|en, else localStorage "sponge.lang", else "de".
export const LANGS = ['de', 'en'];
export const DEFAULT_LANG = 'de';
export const LANG_KEY = 'sponge.lang';

const valid = value => (LANGS.includes(value) ? value : null);

export function resolveLang(search = '', storage = null) {
  try {
    const params = search instanceof URLSearchParams ? search : new URLSearchParams(String(search || ''));
    const fromUrl = valid(params.get('lang'));
    if (fromUrl) return fromUrl;
  } catch { /* fall through */ }
  try {
    const fromStore = valid(storage && storage.getItem(LANG_KEY));
    if (fromStore) return fromStore;
  } catch { /* storage may be blocked */ }
  return DEFAULT_LANG;
}

export function persistLang(lang, storage = null) {
  const value = valid(lang) || DEFAULT_LANG;
  try { if (storage) storage.setItem(LANG_KEY, value); } catch { /* ignore */ }
  return value;
}

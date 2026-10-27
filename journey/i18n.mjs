// Language is a presentation choice: stable machine IDs, source titles and quotations are never translated.
export const LANGS = ['de', 'en'];
export const DEFAULT_LANG = 'de';
const KEY = 'sponge.lang';
export function resolveLang(search = '', storage = null) {
  const q = new URLSearchParams(search).get('lang');
  if (LANGS.includes(q)) return q;
  try { const s = storage?.getItem(KEY); if (LANGS.includes(s)) return s; } catch {}
  return DEFAULT_LANG;
}
export function persistLang(lang, storage = null) { try { storage?.setItem(KEY, lang); } catch {} }
// Pick the text for a language. A missing translation is reported, not hidden behind the other language.
export const pick = (value, lang) => value == null ? '' : typeof value === 'string' ? value : (value[lang] ?? `[${lang}?]`);
export function ui(dict, lang, key) { return dict[lang]?.[key] ?? `[${lang}:${key}]`; }

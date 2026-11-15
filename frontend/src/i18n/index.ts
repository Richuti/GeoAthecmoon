// Versión en inglés de la interfaz (requisito de NASA Space Apps: los materiales se entregan en inglés).
//
// Cómo funciona: la app sigue escribiendo su texto en español. Esta capa observa el DOM y reemplaza cada
// texto (y aria-label, title, placeholder, alt) por su traducción de ./en.ts, guardando el original para
// volver al español sin recargar. React cambia el texto de un nodo asignando nodeValue, así que cada
// actualización vuelve a pasar por aquí. Si una frase no está en el diccionario, se queda en español.
import { translate } from './translate.ts'

export type Lang = 'en' | 'es'

const ATTRS = ['aria-label', 'title', 'placeholder', 'alt', 'aria-valuetext']
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE'])
const STORE_KEY = 'geoathecmoon:lang'

/** Textos que quedaron sin traducir (para QA): en la consola, `[...__i18nMissing]`. */
const missing = new Set<string>()
;(globalThis as { __i18nMissing?: Set<string> }).__i18nMissing = missing
function noteMissing(v: string) {
  const s = v.replace(/\s+/g, ' ').trim()
  if (/[A-Za-zÁ-ú]{2}/.test(s) && !/^[A-Z0-9 ·\-–]+$/.test(s)) missing.add(s)
}

// --- Capa sobre el DOM ---------------------------------------------------------------------------

let lang: Lang = 'es'
const originalText = new WeakMap<Text, string>()
const shownText = new WeakMap<Text, string>()
const originalAttr = new WeakMap<Element, Record<string, string>>()
const shownAttr = new WeakMap<Element, Record<string, string>>()

const skipped = (el: Element | null) => !!el?.closest('[translate="no"], .notranslate') || (!!el && SKIP.has(el.tagName))

function doText(n: Text) {
  const v = n.nodeValue ?? ''
  if (shownText.get(n) === v) return
  if (skipped(n.parentElement)) return
  originalText.set(n, v)
  const t = translate(v)
  if (t === v) noteMissing(v)
  shownText.set(n, t)
  if (t !== v) n.nodeValue = t
}

function doAttrs(el: Element) {
  if (skipped(el)) return
  for (const a of ATTRS) {
    const v = el.getAttribute(a)
    if (v === null) continue
    const shown = shownAttr.get(el) ?? {}
    if (shown[a] === v) continue
    const orig = originalAttr.get(el) ?? {}
    orig[a] = v
    originalAttr.set(el, orig)
    const t = translate(v)
    shown[a] = t
    shownAttr.set(el, shown)
    if (t !== v) el.setAttribute(a, t)
  }
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) return doText(root as Text)
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return
  if (root.nodeType === Node.ELEMENT_NODE) doAttrs(root as Element)
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) doText(n as Text)
    else doAttrs(n as Element)
  }
}

function restore() {
  const w = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) {
      const t = n as Text
      const o = originalText.get(t)
      if (o !== undefined && shownText.get(t) === t.nodeValue) t.nodeValue = o
      shownText.delete(t)
    } else {
      const el = n as Element
      const o = originalAttr.get(el), s = shownAttr.get(el)
      if (o && s) for (const a of Object.keys(o)) if (el.getAttribute(a) === s[a]) el.setAttribute(a, o[a])
      shownAttr.delete(el)
    }
  }
}

const observer = typeof MutationObserver === 'undefined' ? null : new MutationObserver((records) => {
  for (const r of records) {
    if (r.type === 'characterData') doText(r.target as Text)
    else if (r.type === 'attributes') doAttrs(r.target as Element)
    else r.addedNodes.forEach(walk)
  }
})

export function getLang(): Lang { return lang }

export function setLang(next: Lang) {
  lang = next
  try { localStorage.setItem(STORE_KEY, next) } catch { /* sin almacenamiento: no pasa nada */ }
  document.documentElement.lang = next
  observer?.disconnect()
  if (next === 'en') {
    walk(document.documentElement)
    observer?.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS })
  } else {
    restore()
  }
  renderToggle()
}

// --- Selector EN / ES ------------------------------------------------------------------------------

let toggle: HTMLDivElement | null = null

function renderToggle() {
  if (!document.body) return
  if (!toggle) {
    toggle = document.createElement('div')
    toggle.setAttribute('translate', 'no')
    toggle.setAttribute('role', 'group')
    toggle.setAttribute('aria-label', 'Language / Idioma')
    toggle.className = 'lang-toggle'
    for (const l of ['en', 'es'] as const) {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = l.toUpperCase()
      b.dataset.lang = l
      b.setAttribute('aria-label', l === 'en' ? 'English' : 'Español')
      b.addEventListener('click', () => setLang(l))
      toggle.appendChild(b)
    }
    document.body.appendChild(toggle)
  }
  toggle.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)))
}

function initialLang(): Lang {
  const q = new URLSearchParams(window.location.search).get('lang')
  if (q === 'en' || q === 'es') return q
  try {
    const s = localStorage.getItem(STORE_KEY)
    if (s === 'en' || s === 'es') return s
  } catch { /* sin almacenamiento */ }
  return 'en'
}

if (typeof document !== 'undefined') {
  const start = () => setLang(initialLang())
  if (document.body) start()
  else document.addEventListener('DOMContentLoaded', start, { once: true })
}

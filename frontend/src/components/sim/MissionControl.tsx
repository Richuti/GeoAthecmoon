// Control de misión: mientras se reproduce, cada suceso aparece (y, si se activa, se oye) como «qué pasó» y
// «qué hacemos», con los números del simulador. Se le puede preguntar por voz o con un clic.
import { useEffect, useMemo, useRef, useState } from 'react'
import { answer, controlFeed, intentOf, type ControlContext, type Intent, type Tone } from '../../sim/missionControl'
import { Button, cx } from '../ui'
import './mission-control.css'

const ICON: Record<Tone, string> = { info: 'ℹ', warn: '⚠', fail: '✗', ok: '✓' }
const QUICK: Array<{ label: string; intent: Intent }> = [
  { label: '¿Qué pasa?', intent: 'status' },
  { label: '¿Cómo lo resolvemos?', intent: 'fix' },
  { label: '¿Y la batería?', intent: 'battery' },
  { label: '¿Hay Sol?', intent: 'sun' },
  { label: '¿Vemos la Tierra?', intent: 'earth' },
]
const QUESTION: Record<Intent, string> = {
  status: '¿Qué pasa?', fix: '¿Cómo lo resolvemos?', battery: '¿Cómo está la batería?', sun: '¿Hay Sol?', earth: '¿Vemos la Tierra?', play: 'Reproduce', pause: 'Pausa',
}

// --- Voz del navegador (Web Speech): sin servicios externos ni costo ----------------------------------

function speak(text: string, onEnd?: () => void) {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
  if (!synth) { onEnd?.(); return }
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('es-mx')) ?? synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('es'))
  if (voice) u.voice = voice
  u.lang = voice?.lang ?? 'es-ES'
  u.rate = 1.05
  u.onend = () => onEnd?.()
  u.onerror = () => onEnd?.()
  synth.speak(u)
}

interface Recognition { lang: string; interimResults: boolean; maxAlternatives: number; start(): void; abort(): void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null }
function recognitionClass(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const VOICE_KEY = 'geoathecmoon:voz'
function readVoice(): boolean { try { return localStorage.getItem(VOICE_KEY) === '1' } catch { return false } }
function saveVoice(on: boolean) { try { localStorage.setItem(VOICE_KEY, on ? '1' : '0') } catch { /* sin almacenamiento */ } }

export function MissionControl({ ctx, index, playing, onPlay, onPause, onRescue }: {
  ctx: ControlContext
  index: number
  playing: boolean
  onPlay: () => void
  onPause: () => void
  /** Abre el copiloto de IA cuando la misión falla */
  onRescue?: () => void
}) {
  const feed = useMemo(() => controlFeed(ctx, index), [ctx, index])
  const [voice, setVoice] = useState(readVoice)
  const [dialog, setDialog] = useState<{ q: string; a: string } | null>(null)
  const [listening, setListening] = useState(false)
  const Rec = useMemo(recognitionClass, [])
  const rec = useRef<Recognition | null>(null)
  const spoken = useRef(-1)
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

  // Al avanzar, se dice el suceso nuevo más reciente. Si es una falla, la reproducción se detiene mientras habla.
  const latest = feed[0]
  useEffect(() => {
    if (!latest) { spoken.current = -1; return }
    if (latest.index < spoken.current) { spoken.current = latest.index; return } // se retrocedió
    if (latest.index === spoken.current) return
    spoken.current = latest.index
    if (!voice || !playing) return
    const critical = latest.tone === 'fail'
    if (critical) onPause()
    speak(`${latest.problem} ${latest.response}`, () => { if (critical && latest.index < ctx.result.from + ctx.result.series.soc.length - 1) onPlay() })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacciona al suceso, no a cada render
  }, [latest?.index, voice, playing])
  useEffect(() => () => { if (canSpeak) window.speechSynthesis.cancel(); rec.current?.abort() }, [canSpeak])

  const toggleVoice = () => {
    const next = !voice
    setVoice(next)
    saveVoice(next)
    if (!next && canSpeak) window.speechSynthesis.cancel()
    if (next && latest) speak(`${latest.problem} ${latest.response}`)
  }

  const ask = (intent: Intent, question = QUESTION[intent]) => {
    if (intent === 'play') onPlay()
    if (intent === 'pause') onPause()
    const a = answer(ctx, intent, index)
    setDialog({ q: question, a })
    if (canSpeak) speak(a)
  }

  const listen = () => {
    if (!Rec) return
    rec.current?.abort()
    const r = new Rec()
    r.lang = 'es-ES'
    r.interimResults = false
    r.maxAlternatives = 1
    r.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? ''
      if (text) ask(intentOf(text), text)
    }
    r.onerror = () => setListening(false)
    r.onend = () => setListening(false)
    rec.current = r
    setListening(true)
    if (canSpeak) window.speechSynthesis.cancel()
    r.start()
  }

  const failedHere = latest?.tone === 'fail' && !ctx.result.summary.survived
  return (
    <section aria-label="Control de misión" className="mission-control mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-bold text-ink"><span aria-hidden className={cx('mission-control__led', playing && 'is-live')} />Control de misión
          <span className="text-xs font-normal text-ink-muted">· con los datos del simulador</span></p>
        <div className="flex flex-wrap gap-2">
          {canSpeak && <button type="button" className={cx('mission-control__btn', voice && 'is-on')} aria-pressed={voice} onClick={toggleVoice}>
            <svg aria-hidden viewBox="0 0 20 20"><path d="M4 8v4h3l4 3V5L7 8H4Z" fill="currentColor" />{voice && <path d="M13.5 7a4 4 0 0 1 0 6M15.5 5a7 7 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}</svg>
            {voice ? 'Voz activada' : 'Activar voz'}
          </button>}
          {Rec && <button type="button" className={cx('mission-control__btn', listening && 'is-listening')} onClick={listen} disabled={listening}>
            <svg aria-hidden viewBox="0 0 20 20"><rect x="7" y="2.5" width="6" height="10" rx="3" fill="currentColor" /><path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            {listening ? 'Escuchando…' : 'Preguntar por voz'}
          </button>}
        </div>
      </div>

      <ol className="mission-control__feed mt-3" aria-live="polite">
        {feed.slice(0, 3).map((m, i) => (
          <li key={`${m.index}:${m.problem}`} className={cx('mission-control__msg', `is-${m.tone}`, i > 0 && 'is-old')}>
            <span aria-hidden className="mission-control__icon">{ICON[m.tone]}</span>
            <div className="min-w-0">
              <p className="mission-control__problem">{m.problem}</p>
              <p className="mission-control__response"><span aria-hidden>→ </span>{m.response}</p>
            </div>
          </li>
        ))}
        {feed.length === 0 && <li className="mission-control__msg is-info is-old"><span aria-hidden className="mission-control__icon">ℹ</span><p className="mission-control__response">Pulsa «Reproducir la misión»: aquí verás cada suceso y qué hacemos.</p></li>}
      </ol>
      {failedHere && onRescue && <Button variant="primary" className="mt-3 min-h-11" onClick={onRescue}>✦ Ver cómo lo resuelve la IA</Button>}

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Preguntas rápidas al control de misión">
        {QUICK.map((q) => <button key={q.intent} type="button" className="mission-control__chip" onClick={() => ask(q.intent)}>{q.label}</button>)}
      </div>
      {dialog && <div className="mission-control__dialog mt-3" aria-live="polite">
        <p><b>Tú:</b> {dialog.q}</p>
        <p className="mt-1"><b>Control:</b> {dialog.a}</p>
      </div>}
    </section>
  )
}

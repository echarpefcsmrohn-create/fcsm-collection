let audioCtx = null

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}

function playTone(freq, type = 'sine', duration = 0.1, vol = 0.3, delay = 0) {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.value = freq
    const t = ctx.currentTime + delay
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
    osc.start(t)
    osc.stop(t + duration)
  } catch(e) {}
}

export function playAdd() {
  // Ascending success chime
  playTone(523, 'sine', 0.12, 0.25, 0)
  playTone(659, 'sine', 0.12, 0.25, 0.1)
  playTone(784, 'sine', 0.15, 0.3, 0.2)
  playTone(1047, 'sine', 0.2, 0.25, 0.32)
}

export function playDelete() {
  playTone(300, 'sine', 0.08, 0.2, 0)
  playTone(200, 'sine', 0.1, 0.15, 0.08)
}

export function playNav() {
  playTone(880, 'sine', 0.06, 0.08, 0)
}

export function playTick(freq = 700) {
  playTone(freq, 'square', 0.06, 0.12, 0)
}

export function playWin() {
  [523, 659, 784, 1047].forEach((f, i) => playTone(f, 'triangle', 0.22, 0.35, i * 0.12))
}

export function vibrate(pattern = [10]) {
  try { navigator.vibrate?.(pattern) } catch(e) {}
}

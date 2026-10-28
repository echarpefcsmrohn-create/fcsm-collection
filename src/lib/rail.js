// Rail de navigation a droite : uniquement quand l'ecran reserve une grande bande
// a droite (iPhone Duo ferme). Ailleurs (telephone standard, Duo ouvert) la barre reste en bas.
// Test manuel : ajouter ?rail=1 a l'URL (force) ou ?rail=0 (desactive). Memorise dans le navigateur.
const SEUIL = 80 // px CSS : plus que l'encoche d'un iPhone en paysage (~59)

function insetDroit() {
  const p = document.createElement('div')
  p.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-right:env(safe-area-inset-right,0px)'
  document.body.appendChild(p)
  const w = parseFloat(getComputedStyle(p).paddingRight) || 0
  p.remove()
  return w
}

function lireForce() {
  try { return localStorage.getItem('fcsm_rail') } catch { return null }
}

// ?rail= n'est lu qu'au demarrage, sinon il ecraserait le reglage fait dans l'app
function lireUrl() {
  try {
    const q = new URLSearchParams(location.search).get('rail')
    if (q === '1' || q === '0') localStorage.setItem('fcsm_rail', q)
    if (q === 'auto') localStorage.removeItem('fcsm_rail')
  } catch { /* stockage indisponible */ }
}

// Mode choisi : 'auto' | '1' (rail) | '0' (barre en bas)
export const getRailMode = () => lireForce() ?? 'auto'

function maj() {
  const force = lireForce()
  const actif = force === '1' || (force !== '0' && insetDroit() >= SEUIL)
  const r = document.documentElement
  r.classList.toggle('has-rail', actif)
  r.style.setProperty('--rail-pad', actif ? 'max(env(safe-area-inset-right, 0px), 88px)' : 'env(safe-area-inset-right, 0px)')
}

// Reglage depuis l'app (une app installee n'a pas d'URL pour ?rail=)
export function setRailMode(mode) {
  try { mode === 'auto' ? localStorage.removeItem('fcsm_rail') : localStorage.setItem('fcsm_rail', mode) } catch { /* stockage indisponible */ }
  maj()
}

export function initRail() {
  lireUrl()
  maj()
  window.addEventListener('resize', maj)
  window.addEventListener('orientationchange', maj)
}

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
  try {
    const q = new URLSearchParams(location.search).get('rail')
    if (q === '1' || q === '0') localStorage.setItem('fcsm_rail', q)
    if (q === 'auto') localStorage.removeItem('fcsm_rail')
    return localStorage.getItem('fcsm_rail')
  } catch { return null }
}

export function initRail() {
  const force = lireForce()
  const maj = () => {
    const actif = force === '1' || (force !== '0' && insetDroit() >= SEUIL)
    const r = document.documentElement
    r.classList.toggle('has-rail', actif)
    r.style.setProperty('--rail-pad', actif ? 'max(env(safe-area-inset-right, 0px), 88px)' : 'env(safe-area-inset-right, 0px)')
  }
  maj()
  window.addEventListener('resize', maj)
  window.addEventListener('orientationchange', maj)
}

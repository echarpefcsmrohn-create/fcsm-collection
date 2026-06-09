export const ERAS = [
  { id:'1930-1940', label:'1930–1940' },
  { id:'1940-1980', label:'1940–1980' },
  { id:'1990-1994', label:'1990–1994' },
  { id:'1994-1997', label:'1994–1997' },
  { id:'1997-2000', label:'1997–2000' },
  { id:'2000-2004', label:'2000–2004' },
  { id:'2004-2010', label:'2004–2010' },
  { id:'2010-2015', label:'2010–2015' },
  { id:'2015-auj',  label:'2015–Auj.' },
]
export const ERA_ORDER = ERAS.map(e => e.id)

export function getEraLabel(eraId) {
  return ERAS.find(e => e.id === eraId)?.label || eraId
}

export function getScarfNumber(scarf, collection) {
  const sorted = [...collection].sort((a,b) => new Date(a.added_at) - new Date(b.added_at))
  const idx = sorted.findIndex(s => String(s.id) === String(scarf.id))
  return idx === -1 ? '???' : String(idx + 1).padStart(3, '0')
}

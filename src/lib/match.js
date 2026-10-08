/**
 * Logique des écharpes de match : résultat, couleurs, formatage.
 * Le score est stocké du point de vue du FCSM (score_fcsm / score_opponent),
 * indépendamment du lieu de la rencontre.
 */

export const RESULTS = {
  win:  { label: 'Victoire', short: 'V', color: '#22c55e', bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.5)' },
  draw: { label: 'Nul',      short: 'N', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.5)' },
  loss: { label: 'Défaite',  short: 'D', color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.5)' },
}

/** Badges pleins de la DA rétro (texte blanc sur fond uni). */
export const RETRO_BADGE = {
  win:  { bg: '#2E9E57', color: '#FFFFFF' },
  draw: { bg: '#6B7280', color: '#FFFFFF' },
  loss: { bg: '#D6362B', color: '#FFFFFF' },
}

/** Retourne 'win' | 'draw' | 'loss' | null si le score n'est pas renseigné. */
export function getResult(scarf) {
  if (!scarf?.is_match) return null
  const f = scarf.score_fcsm
  const o = scarf.score_opponent
  if (f == null || o == null) return null
  if (f > o) return 'win'
  if (f < o) return 'loss'
  return 'draw'
}

/** Style associé au résultat, ou null. */
export function getResultStyle(scarf) {
  const r = getResult(scarf)
  return r ? RESULTS[r] : null
}

/**
 * Score formaté dans l'ordre d'affichage réel du match.
 * À domicile : FCSM d'abord. À l'extérieur : adversaire d'abord.
 */
export function formatScore(scarf) {
  if (!scarf?.is_match) return null
  const f = scarf.score_fcsm
  const o = scarf.score_opponent
  if (f == null || o == null) return null
  return scarf.is_home === false ? `${o}-${f}` : `${f}-${o}`
}

/** Score court toujours du point de vue FCSM, pour les badges compacts. */
export function formatScoreFcsm(scarf) {
  const f = scarf?.score_fcsm
  const o = scarf?.score_opponent
  if (f == null || o == null) return null
  return `${f}-${o}`
}

/** Libellé de la rencontre, ex : "FCSM - AS Monaco" ou "AS Monaco - FCSM". */
export function formatFixture(scarf) {
  if (!scarf?.is_match || !scarf.opponent) return null
  return scarf.is_home === false
    ? `${scarf.opponent} - FCSM`
    : `FCSM - ${scarf.opponent}`
}

/** Date du match en français, ex : "17 mai 2004". */
export function formatMatchDate(scarf) {
  if (!scarf?.match_date) return null
  try {
    return new Date(scarf.match_date).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    })
  } catch { return null }
}

/** Statistiques agrégées sur l'ensemble des écharpes de match. */
export function getMatchStats(collection = []) {
  const matches = collection.filter(s => s.is_match && getResult(s))
  const stats = { total: matches.length, win: 0, draw: 0, loss: 0, goalsFor: 0, goalsAgainst: 0 }
  matches.forEach(s => {
    stats[getResult(s)]++
    stats.goalsFor += s.score_fcsm ?? 0
    stats.goalsAgainst += s.score_opponent ?? 0
  })
  return stats
}

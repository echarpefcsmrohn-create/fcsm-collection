import { supabase } from './supabase'

const PROXY_URL = 'https://fcsm-ai-proxy.echarpe-fcsm-rohn.workers.dev'
const EMBED_URL = `${PROXY_URL}/embed`

/**
 * Compresse une image et la retourne en base64 data URL.
 * On vise ~200px : suffisant pour Voyage, et ça reste sous
 * le seuil des 50 000 pixels facturés au minimum.
 */
export function compressForEmbed(src, maxSize = 200) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      const ratio = Math.min(maxSize / width, maxSize / height, 1)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      // Fond blanc pour les PNG transparents (photos détourées)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => reject(new Error('Impossible de charger l\'image'))
    img.src = src
  })
}

/**
 * Calcule l'embedding visuel d'une image via Voyage AI.
 * @param {string} imageSrc - data URL ou URL http (Cloudinary)
 * @param {'document'|'query'} inputType
 * @returns {Promise<number[]>} vecteur de 1024 dimensions
 */
export async function getImageEmbedding(imageSrc, inputType = 'document') {
  const compressed = await compressForEmbed(imageSrc)

  const res = await fetch(EMBED_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input_type: inputType,
      inputs: [
        { content: [{ type: 'image_base64', image_base64: compressed }] }
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Voyage error ${res.status}: ${err.slice(0, 100)}`)
  }

  const data = await res.json()
  const embedding = data?.data?.[0]?.embedding
  if (!embedding) throw new Error('Pas d\'embedding retourné par Voyage')
  return embedding
}

/**
 * Cherche les écharpes visuellement similaires via pgvector.
 * @param {number[]} embedding
 * @param {number} threshold - 0 à 1, plus haut = plus strict
 * @param {number} count
 */
export async function findSimilarScarves(embedding, threshold = 0.72, count = 5) {
  const { data, error } = await supabase.rpc('match_scarves', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: count,
  })
  if (error) throw error
  return data || []
}

/**
 * Pipeline complet : photo → embedding → recherche de doublons.
 * Retourne { embedding, matches }
 */
export async function checkVisualDuplicate(imageSrc, threshold = 0.89) {
  const embedding = await getImageEmbedding(imageSrc, 'query')
  const matches = await findSimilarScarves(embedding, threshold)
  return { embedding, matches }
}

/**
 * Sauvegarde l'embedding d'une écharpe déjà en base.
 */
export async function saveEmbedding(scarfId, embedding) {
  const { error } = await supabase
    .from('Scarves')
    .update({ embedding })
    .eq('id', scarfId)
  if (error) throw error
}

/**
 * Similarité cosinus entre deux vecteurs (utilitaire, si besoin en local).
 */
export function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://gkarhbhskeehvvhrmwza.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrYXJoYmhza2VlaHZ2aHJtd3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMzgxMjUsImV4cCI6MjA5MjcxNDEyNX0.GATbD0_I8Q--uNXMJ6UpB0VSOYxHViLIjPoC54kGI3Q'
)

// Colonnes utiles à l'affichage. `embedding` est volontairement exclu :
// le vecteur (1024 dimensions) pèse ~1,9 Mo pour 99 écharpes et n'est jamais
// lu côté app — la comparaison visuelle se fait côté Supabase via pgvector.
const SCARF_COLUMNS = 'id, Name, era, price, photo_url, added_at'

export async function getScarves() {
  const { data, error } = await supabase
    .from('Scarves')
    .select(SCARF_COLUMNS)
    .order('added_at', { ascending: false })
  if (error) throw error
  return data || []
}
export async function addScarf(scarf) {
  // L'embedding est bien enregistré en base, simplement pas renvoyé au client.
  const { data, error } = await supabase
    .from('Scarves')
    .insert([scarf])
    .select(SCARF_COLUMNS)
  if (error) throw error
  return data[0]
}
export async function updateScarf(id, updates) {
  const { error } = await supabase.from('Scarves').update(updates).eq('id', id)
  if (error) throw error
}
export async function deleteScarf(id) {
  const { error } = await supabase.from('Scarves').delete().eq('id', id)
  if (error) throw error
}

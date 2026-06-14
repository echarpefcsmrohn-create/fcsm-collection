import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://gkarhbhskeehvvhrmwza.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrYXJoYmhza2VlaHZ2aHJtd3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMzgxMjUsImV4cCI6MjA5MjcxNDEyNX0.GATbD0_I8Q--uNXMJ6UpB0VSOYxHViLIjPoC54kGI3Q'
)

export async function getScarves() {
  const { data, error } = await supabase.from('Scarves').select('*').order('added_at', { ascending: false })
  if (error) throw error
  return data || []
}
export async function addScarf(scarf) {
  const { data, error } = await supabase.from('Scarves').insert([scarf]).select()
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

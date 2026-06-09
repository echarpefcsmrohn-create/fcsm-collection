const CLOUD_NAME = 'dxwjoflqn'
const UPLOAD_PRESET = 'fcsm_unsigned'

export async function uploadPhoto(file) {
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', UPLOAD_PRESET)
  form.append('folder', 'fcsm-collection')
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method:'POST', body: form })
  if (!r.ok) throw new Error('Upload failed')
  const data = await r.json()
  return data.secure_url
}

export async function removeBackground(file) {
  // Use remove.bg
  const formData = new FormData()
  formData.append('image_file', file)
  formData.append('size', 'auto')
  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': 'uEBwdspEM8HYZhCcDPe63Yef' },
    body: formData
  })
  if (!response.ok) throw new Error('remove.bg failed')
  const blob = await response.blob()
  return new File([blob], 'photo_nobg.png', { type: 'image/png' })
}

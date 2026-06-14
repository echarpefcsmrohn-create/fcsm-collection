const CLOUD_NAME = 'dxwjoflqn'
const UPLOAD_PRESET = 'fcsm_unsigned'

export function compressImage(dataUrl, maxW = 800) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width)
      const c = document.createElement('canvas')
      c.width = img.width * scale
      c.height = img.height * scale
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/jpeg', 0.72))
    }
    img.src = dataUrl
  })
}

export async function uploadToCloudinary(file) {
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', UPLOAD_PRESET)
  form.append('folder', 'fcsm-collection')
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST', body: form
  })
  if (!r.ok) throw new Error('Upload Cloudinary échoué')
  const data = await r.json()
  return data.secure_url
}

export async function removeBackground(file) {
  // Upload first, then apply bg removal via Cloudinary transformation URL
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', UPLOAD_PRESET)
  form.append('folder', 'fcsm-collection')

  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST', body: form
  })
  if (!r.ok) throw new Error('Upload failed')
  const data = await r.json()

  // Apply background removal via URL transformation
  // e_background_removal uses Pixelz addon
  const publicId = data.public_id
  const bgRemovedUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/e_background_removal/${publicId}.png`

  // Wait a moment for processing
  await new Promise(r => setTimeout(r, 3000))

  return { cloudinaryUrl: bgRemovedUrl, isCloudinary: true }
}

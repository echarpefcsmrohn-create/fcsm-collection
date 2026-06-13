const CLOUD_NAME = 'dxwjoflqn'
const UPLOAD_PRESET = 'fcsm_unsigned'
const REMOVEBG_KEY = 'uEBwdspEM8HYZhCcDPe63Yef'

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
  const formData = new FormData()
  formData.append('image_file', file)
  formData.append('size', 'auto')
  const r = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': REMOVEBG_KEY },
    body: formData
  })
  if (!r.ok) throw new Error('remove.bg échoué')
  const blob = await r.blob()
  // Add white background
  return new Promise(resolve => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const W = 600, H = 1200
      const c = document.createElement('canvas')
      c.width = W; c.height = H
      const ctx = c.getContext('2d')
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, W, H)
      const scale = Math.min(W/img.width, H/img.height) * 0.98
      const x = (W - img.width*scale) / 2
      const y = (H - img.height*scale) / 2
      ctx.drawImage(img, x, y, img.width*scale, img.height*scale)
      URL.revokeObjectURL(url)
      c.toBlob(blob => resolve(new File([blob], 'photo_nobg.png', { type:'image/png' })), 'image/png')
    }
    img.src = url
  })
}

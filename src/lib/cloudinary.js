const CLOUD_NAME = 'dxwjoflqn'
const UPLOAD_PRESET = 'fcsm_unsigned'

// Rotation automatique des clés remove.bg
const REMOVEBG_KEYS = [
  'uEBwdspEM8HYZhCcDPe63Yef',
  'gr7tMvLtzP1WnttL1ZjrMJZG',
  '84R1t6YDH6vzw4SWSCTcUWRa',
]

const REMOVEBG_KEY_INDEX = 'fcsm_removebg_key_index'

function getCurrentKeyIndex() {
  return parseInt(localStorage.getItem(REMOVEBG_KEY_INDEX) || '0')
}

function nextKey() {
  const next = (getCurrentKeyIndex() + 1) % REMOVEBG_KEYS.length
  localStorage.setItem(REMOVEBG_KEY_INDEX, String(next))
  return REMOVEBG_KEYS[next]
}

function getCurrentKey() {
  return REMOVEBG_KEYS[getCurrentKeyIndex()]
}

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
  // Try each key until one works
  for (let attempt = 0; attempt < REMOVEBG_KEYS.length; attempt++) {
    const key = getCurrentKey()
    const formData = new FormData()
    formData.append('image_file', file)
    formData.append('size', 'auto')

    const r = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': key },
      body: formData
    })

    if (r.ok) {
      const blob = await r.blob()
      return new File([blob], 'photo_nobg.png', { type: 'image/png' })
    }

    // 402 = credits exhausted, try next key
    if (r.status === 402 || r.status === 403) {
      console.log(`Key ${getCurrentKeyIndex()} exhausted, switching...`)
      nextKey()
      continue
    }

    throw new Error('remove.bg error: ' + r.status)
  }

  throw new Error('Tous les crédits remove.bg sont épuisés')
}

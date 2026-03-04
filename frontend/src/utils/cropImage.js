/**
 * Image utilities for crop editor.
 */

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.crossOrigin = 'anonymous'
    img.src = url
  })
}

/**
 * Rotate an image by `degrees` and return a new Object URL.
 * Returns the original src unchanged if degrees === 0.
 */
export async function rotateImage(src, degrees) {
  if (degrees === 0) return src
  const img = await loadImage(src)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const rad = (degrees * Math.PI) / 180
  const sin = Math.abs(Math.sin(rad))
  const cos = Math.abs(Math.cos(rad))
  canvas.width = Math.round(img.naturalWidth * cos + img.naturalHeight * sin)
  canvas.height = Math.round(img.naturalWidth * sin + img.naturalHeight * cos)
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(rad)
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(URL.createObjectURL(blob)), 'image/jpeg', 0.95)
  })
}

/**
 * Crop an <img> element using pixel-based crop from react-image-crop.
 * Accounts for display vs natural size difference.
 * Returns a JPEG Blob.
 */
export function cropFromElement(imgEl, crop) {
  const scaleX = imgEl.naturalWidth / imgEl.width
  const scaleY = imgEl.naturalHeight / imgEl.height
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(crop.width * scaleX)
  canvas.height = Math.round(crop.height * scaleY)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(
    imgEl,
    crop.x * scaleX, crop.y * scaleY,
    crop.width * scaleX, crop.height * scaleY,
    0, 0, canvas.width, canvas.height
  )
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.92)
  })
}

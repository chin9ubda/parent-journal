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

/**
 * Rotate + crop in a single canvas pass.
 *
 * The image is CSS-rotated for preview, but ReactCrop's crop coordinates
 * are in the img element's unrotated layout space. This function renders
 * exactly what the user sees through the crop box by:
 *   1. Creating a canvas sized to the crop region (at natural resolution)
 *   2. Positioning the rotation center relative to the crop box
 *   3. Drawing the original image rotated around that center
 *
 * @param {string} src - original image URL
 * @param {number} degrees - rotation angle
 * @param {Object} crop - {x, y, width, height} in display pixels
 * @param {number} displayW - img element display width
 * @param {number} displayH - img element display height
 * @returns {Promise<Blob>} cropped JPEG blob
 */
export async function rotateAndCrop(src, degrees, crop, displayW, displayH) {
  const img = await loadImage(src)
  const scaleX = img.naturalWidth / displayW
  const scaleY = img.naturalHeight / displayH
  const rad = (degrees * Math.PI) / 180

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(crop.width * scaleX)
  canvas.height = Math.round(crop.height * scaleY)
  const ctx = canvas.getContext('2d')

  // Image center position relative to the crop box top-left, in natural pixels
  const cx = (displayW / 2 - crop.x) * scaleX
  const cy = (displayH / 2 - crop.y) * scaleY

  ctx.translate(cx, cy)
  ctx.rotate(rad)
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.92)
  })
}

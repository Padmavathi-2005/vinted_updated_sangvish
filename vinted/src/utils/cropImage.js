/**
 * Create an HTML image element from a URL
 * @param {string} url 
 * @returns {Promise<HTMLImageElement>}
 */
export const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous') // to avoid CORS issues
    image.src = url
  })

/**
 * Get the cropped image as a Blob/File
 * @param {string} imageSrc - base64 or blob url
 * @param {Object} pixelCrop - crop area from react-easy-crop
 * @param {number} rotation - rotation angle
 * @param {number} targetWidth - optional: final width to resize to
 * @returns {Promise<Blob>}
 */
export default async function getCroppedImg(imageSrc, pixelCrop, rotation = 0, targetWidth = null) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return null
  }

  const rotRad = (rotation * Math.PI) / 180

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  )

  // set canvas size to match the bounding box
  canvas.width = bBoxWidth
  canvas.height = bBoxHeight

  // translate canvas context to a central point to allow rotating and flipping around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
  ctx.rotate(rotRad)
  ctx.translate(-image.width / 2, -image.height / 2)

  // draw rotated image
  ctx.drawImage(image, 0, 0)

  // Extract the cropped image data
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  )

  if (targetWidth) {
    // RESIZE LOGIC
    // Set canvas to intermediate crop size
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = pixelCrop.width;
    tempCanvas.height = pixelCrop.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(data, 0, 0);

    // Now resize to targetWidth
    const scaleFactor = targetWidth / pixelCrop.width;
    canvas.width = targetWidth;
    canvas.height = pixelCrop.height * scaleFactor;
    
    // Smooth scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(tempCanvas, 0, 0, targetWidth, canvas.height);
  } else {
    // Standard logic
    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height
    ctx.putImageData(data, 0, 0)
  }

  // As a blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      resolve(file)
    }, 'image/jpeg', 0.9)
  })
}

/**
 * Helper to calculate the new bounding box after rotation
 */
function rotateSize(width, height, rotation) {
  const rotRad = (rotation * Math.PI) / 180

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  }
}

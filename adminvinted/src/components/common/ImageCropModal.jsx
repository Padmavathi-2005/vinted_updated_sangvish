import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import getCroppedImg from '../../utils/cropImage'
import '../../styles/ImageCropModal.css'
import { FaTimes, FaCheck, FaSyncAlt, FaSearchPlus, FaSearchMinus } from 'react-icons/fa'
import { useEffect } from 'react'

const ImageCropModal = ({ image, onCropComplete, onCancel, aspect = 1 }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [activeAspect, setActiveAspect] = useState(aspect)
  const [mediaSize, setMediaSize] = useState(null)
  const [originalAspect, setOriginalAspect] = useState(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
        document.body.style.overflow = 'auto';
    };
  }, []);

  const onMediaLoaded = (mediaSize) => {
    setMediaSize(mediaSize)
    const originalRatio = mediaSize.width / mediaSize.height;
    setOriginalAspect(originalRatio);
    if (activeAspect === null) {
        setActiveAspect(originalRatio);
    }
  }

  const aspectPresets = [
    { label: 'Original Ratio', value: 'original' },
    { label: '1:1', value: 1 },
    { label: '3:4', value: 3 / 4 },
    { label: '4:3', value: 4 / 3 },
  ]

  const onCropChange = (crop) => {
    setCrop(crop)
  }

  const onZoomChange = (zoom) => {
    setZoom(zoom)
  }

  const onRotationChange = (rotation) => {
    setRotation(rotation)
  }

  const onCropCompleteLocal = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleCrop = async () => {
    try {
      const croppedImage = await getCroppedImg(
        image,
        croppedAreaPixels,
        rotation
      )
      onCropComplete(croppedImage)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="crop-modal-overlay">
      <div className="crop-modal-container">
        <div className="crop-modal-scroll-area">
          <div className="crop-modal-header">
            <h3>Crop Image</h3>
          <button className="crop-modal-close" onClick={onCancel}>
            <FaTimes />
          </button>
        </div>
        <div className="crop-modal-body">
          <div className="crop-container">
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={activeAspect}
              onCropChange={onCropChange}
              onCropComplete={onCropCompleteLocal}
              onZoomChange={onZoomChange}
              onRotationChange={onRotationChange}
              onMediaLoaded={onMediaLoaded}
            />
          </div>
        </div>
        <div className="crop-modal-footer">
          <div className="crop-actions-top">
             <button className="btn-skip" onClick={() => onCropComplete(null)}>
                Upload Original (No Crop)
            </button>
          </div>
          <div className="crop-help-tip">
            <FaCheck style={{ color: '#10b981', marginRight: '6px' }} />
            Zoom and drag the image to cut the exact part you want.
          </div>
          <div className="aspect-ratio-selector">
            <span className="aspect-label">Aspect Ratio:</span>
            <div className="aspect-buttons">
              {aspectPresets.map((preset) => (
                <button
                  key={preset.label}
                  className={`aspect-btn ${
                    (preset.value === 'original' && activeAspect === originalAspect) || 
                    activeAspect === preset.value ? 'active' : ''
                  }`}
                  onClick={() => setActiveAspect(preset.value === 'original' ? originalAspect : preset.value)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div className="crop-controls">
            <div className="control-group">
              <label className="control-label-text">Zoom</label>
              <div className="slider-wrapper">
                <FaSearchMinus onClick={() => setZoom(Math.max(1, zoom - 0.2))} className="control-icon" title="Zoom Out" />
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.01}
                  aria-labelledby="Zoom"
                  onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                  className="zoom-range"
                />
                <FaSearchPlus onClick={() => setZoom(Math.min(3, zoom + 0.2))} className="control-icon" title="Zoom In" />
              </div>
            </div>
            <div className="control-group">
              <label className="control-label-text">Rotate</label>
              <div className="slider-wrapper">
                <FaSyncAlt onClick={() => setRotation(0)} className="control-icon" title="Reset Rotation" />
                <input
                  type="range"
                  value={rotation}
                  min={0}
                  max={360}
                  step={1}
                  aria-labelledby="Rotation"
                  onChange={(e) => onRotationChange(parseFloat(e.target.value))}
                  className="rotation-range"
                />
                <div style={{ width: '16px' }}></div> {/* Spacer for alignment */}
              </div>
            </div>
          </div>
          <div className="crop-actions">
            <button className="btn-cancel" onClick={onCancel}>
                Cancel
            </button>
            <button className="btn-save" onClick={handleCrop}>
                Apply Crop
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

export default ImageCropModal

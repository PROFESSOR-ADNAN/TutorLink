import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';

// Crops the image to the selected area and returns a Blob, using an
// offscreen canvas — this is what actually turns the crop selection into
// a real file we upload, rather than just a visual preview.
function getCroppedBlob(imageSrc, cropPixels) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = cropPixels.width;
      canvas.height = cropPixels.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        image,
        cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
        0, 0, cropPixels.width, cropPixels.height,
      );
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Could not process image'));
        resolve(blob);
      }, 'image/jpeg', 0.92);
    };
    image.onerror = () => reject(new Error('Could not load image'));
    image.src = imageSrc;
  });
}

/**
 * <ImageCropModal file={selectedFile} aspect={1} onCancel={...} onSave={(blob) => ...} />
 * aspect: 1 for avatar (square), a wide ratio like 3 for a cover banner.
 */
export default function ImageCropModal({ file, aspect = 1, title = 'Adjust photo', onCancel, onSave }) {
  const [imageSrc] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_croppedArea, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      onSave(blob);
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div className="bg-surface w-full max-w-lg rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-canvas-200 flex items-center justify-between">
          <h3 className="font-serif text-lg text-ink-900">{title}</h3>
          <button onClick={onCancel} className="text-ink-400 hover:text-ink-700 p-1" aria-label="Close">✕</button>
        </div>

        {/* The crop stage — drag to reposition, scroll/pinch or the slider below to zoom */}
        <div className="relative bg-canvas-900" style={{ height: aspect === 1 ? '320px' : '220px', background: '#141410' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={aspect === 1 ? 'round' : 'rect'}
            showGrid={aspect !== 1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-ink-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="range" min={1} max={3} step={0.01} value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-forest-800"
              aria-label="Zoom"
            />
            <svg className="w-5 h-5 text-ink-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-xs text-ink-400 text-center">Drag the photo to reposition it, and use the slider to zoom.</p>

          <div className="flex gap-3">
            <button onClick={onCancel} className="btn-secondary flex-1" disabled={saving}>Cancel</button>
            <button onClick={handleSave} className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving…' : 'Save photo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

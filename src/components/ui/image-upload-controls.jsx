/**
 * Shared image upload controls component
 * Provides file input and URL input for image selection
 */

export function ImageUploadControls({ fileInputRef, imageUrl, onImageUrlChange, onImageUpload }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ minWidth: 120, color: '#666' }}>Image:</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onImageUpload}
          style={{ flex: 1 }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ minWidth: 120, color: '#666' }}>Image URL:</label>
        <input
          type="text"
          value={imageUrl}
          onChange={(e) => onImageUrlChange(e.target.value)}
          placeholder="Enter image URL or upload file"
          style={{ flex: 1, padding: '4px 8px' }}
        />
      </div>
    </>
  );
}


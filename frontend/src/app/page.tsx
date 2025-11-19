'use client'

import { useState } from 'react'

export default function Home() {
  const [photo, setPhoto] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<string>('')

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setPhoto(e.target.files[0])
    }
  }

  const uploadPhoto = async () => {
    if (!photo) return

    setUploading(true)
    setResult('')

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(photo)
      })

      const photoData = base64.split(',')[1]

      // Get location if available
      let location = null
      if (navigator.geolocation) {
        location = await new Promise<{latitude: number, longitude: number}>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            }),
            () => reject()
          )
        }).catch(() => null)
      }

      const response = await fetch(`${process.env.API_ENDPOINT}/photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo: photoData,
          metadata: { location }
        })
      })

      const data = await response.json()
      setResult(response.ok ? `Success! Photo ID: ${data.photoId}` : `Error: ${data.error}`)
    } catch (error) {
      setResult('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h1>Deal Discovery</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          style={{ marginBottom: '10px', display: 'block' }}
        />
        
        <button
          onClick={uploadPhoto}
          disabled={!photo || uploading}
          style={{
            padding: '10px 20px',
            backgroundColor: photo && !uploading ? '#007bff' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: photo && !uploading ? 'pointer' : 'not-allowed'
          }}
        >
          {uploading ? 'Uploading...' : 'Upload Photo'}
        </button>
      </div>

      {result && (
        <div style={{
          padding: '10px',
          backgroundColor: result.includes('Success') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${result.includes('Success') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px'
        }}>
          {result}
        </div>
      )}
    </div>
  )
}

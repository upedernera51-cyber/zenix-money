import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#10b981',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          color: '#000',
          fontSize: 26,
          fontWeight: 900,
          fontStyle: 'italic',
          letterSpacing: -2,
        }}
      >
        Z
      </div>
    ),
    { ...size }
  )
}

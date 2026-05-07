import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
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
          color: '#000',
          fontSize: 140,
          fontWeight: 900,
          fontStyle: 'italic',
          letterSpacing: -10,
        }}
      >
        Z
      </div>
    ),
    { ...size }
  )
}

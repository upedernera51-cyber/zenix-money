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
        }}
      >
        <svg width="130" height="130" viewBox="0 0 24 24" fill="black" xmlns="http://www.w3.org/2000/svg">
          <path d="M 13 5 L 6.5 12.7 L 12 12.7 L 11 18.5 L 17.5 10.8 L 12 10.8 Z" />
        </svg>
      </div>
    ),
    { ...size }
  )
}

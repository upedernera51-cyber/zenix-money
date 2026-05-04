// app/layout.tsx
import './globals.css'

export const metadata = {
  title: 'Zenix Money Manager',
  description: 'Inteligencia Operativa',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
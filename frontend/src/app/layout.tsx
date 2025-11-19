export const metadata = {
  title: 'Deal Discovery',
  description: 'Find local deals by taking photos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Arial, sans-serif' }}>
        <nav style={{ 
          backgroundColor: '#007bff', 
          padding: '10px 20px',
          marginBottom: '20px'
        }}>
          <a href="/" style={{ color: 'white', textDecoration: 'none', marginRight: '20px' }}>
            Upload
          </a>
          <a href="/deals" style={{ color: 'white', textDecoration: 'none' }}>
            View Deals
          </a>
        </nav>
        {children}
      </body>
    </html>
  )
}

'use client'

import { useState, useEffect } from 'react'

interface Deal {
  id: string
  businessName: string
  dealText: string
  price: number
  expiresAt: string | null
  latitude: number
  longitude: number
  createdAt: string
}

export default function Deals() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const response = await fetch(`${process.env.API_ENDPOINT}/deals?active=true`)
        if (response.ok) {
          const data = await response.json()
          setDeals(data.deals)
        }
      } catch (error) {
        console.error('Failed to fetch deals:', error)
        // Fallback to mock data
        setDeals([
          {
            id: '1',
            businessName: 'Pizza Palace',
            dealText: '50% off large pizzas expires 12/31/2024',
            price: 12.99,
            expiresAt: '2024-12-31T23:59:59Z',
            latitude: 40.7128,
            longitude: -74.0060,
            createdAt: '2024-11-19T20:00:00Z'
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchDeals()
  }, [])

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading deals...</div>
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Local Deals</h1>
      
      {deals.length === 0 ? (
        <p>No deals found.</p>
      ) : (
        <div>
          {deals.map((deal) => (
            <div
              key={deal.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '15px',
                backgroundColor: isExpired(deal.expiresAt) ? '#f8f8f8' : 'white'
              }}
            >
              <h3 style={{ margin: '0 0 10px 0', color: isExpired(deal.expiresAt) ? '#666' : '#333' }}>
                {deal.businessName || 'Unknown Business'}
              </h3>
              
              <p style={{ margin: '5px 0' }}>{deal.dealText}</p>
              
              {deal.price > 0 && (
                <p style={{ margin: '5px 0', fontWeight: 'bold', color: '#007bff' }}>
                  ${deal.price.toFixed(2)}
                </p>
              )}
              
              <div style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                {deal.expiresAt && (
                  <span style={{ 
                    color: isExpired(deal.expiresAt) ? '#dc3545' : '#28a745',
                    fontWeight: 'bold'
                  }}>
                    {isExpired(deal.expiresAt) ? 'Expired' : 'Expires'}: {formatDate(deal.expiresAt)}
                  </span>
                )}
                <br />
                Found: {formatDate(deal.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div style={{ marginTop: '30px' }}>
        <a href="/" style={{ color: '#007bff', textDecoration: 'none' }}>
          ← Upload New Photo
        </a>
      </div>
    </div>
  )
}

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
  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [address, setAddress] = useState('')
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3959 // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  const geocodeAddress = async (address: string) => {
    try {
      const response = await fetch(`${process.env.API_ENDPOINT}/geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      })
      const data = await response.json()
      if (data.latitude && data.longitude) {
        return { lat: data.latitude, lng: data.longitude }
      }
    } catch (error) {
      console.error('Geocoding failed:', error)
    }
    return null
  }

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address.trim()) return
    
    const location = await geocodeAddress(address)
    if (location) {
      setUserLocation(location)
    } else {
      alert('Address not found. Please try a different address.')
    }
  }

  useEffect(() => {
    if (userLocation && deals.length > 0) {
      const nearby = deals.filter(deal => {
        const distance = calculateDistance(userLocation.lat, userLocation.lng, deal.latitude, deal.longitude)
        return distance <= 10
      })
      setFilteredDeals(nearby)
    } else {
      setFilteredDeals(deals)
    }
  }, [userLocation, deals])

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
      
      <form onSubmit={handleAddressSubmit} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Filter by Location (10 mile radius):
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter address, city, or zip code"
            style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
            Search
          </button>
        </div>
        {userLocation && (
          <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
            Showing deals within 10 miles of your location • 
            <button 
              type="button" 
              onClick={() => { setUserLocation(null); setAddress('') }}
              style={{ marginLeft: '5px', background: 'none', border: 'none', color: '#007bff', textDecoration: 'underline', cursor: 'pointer' }}
            >
              Clear filter
            </button>
          </div>
        )}
      </form>
      
      {filteredDeals.length === 0 && !loading ? (
        <p>{userLocation ? 'No deals found within 10 miles of your location.' : 'No deals found.'}</p>
      ) : (
        <div>
          {filteredDeals.map((deal) => (
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

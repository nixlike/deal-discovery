/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  env: {
    API_ENDPOINT: process.env.API_ENDPOINT || 'https://5a5akzoql6.execute-api.us-east-1.amazonaws.com/dev'
  }
}

module.exports = nextConfig

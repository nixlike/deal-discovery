/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    API_ENDPOINT: process.env.API_ENDPOINT || 'https://your-api-endpoint.com/dev'
  }
}

module.exports = nextConfig

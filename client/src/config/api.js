/**
 * API Configuration
 * Centralized configuration for backend API URL
 * 
 * Production: Uses VITE_API_BASE_URL from .env file if set
 * Development: Uses http://localhost:4004 if VITE_API_BASE_URL is not set
 * 
 * Usage:
 *   import { getApiBaseUrl } from '../config/api'
 *   const response = await fetch(`${getApiBaseUrl()}/api/endpoint`)
 */

/**
 * Get the base URL for API requests
 * @returns {string} Base URL for API requests
 */
export const getApiBaseUrl = () => {
  // Check if VITE_API_BASE_URL is set (production mode with .env file)
  const apiUrl = import.meta.env.VITE_API_BASE_URL
  
  if (apiUrl) {
    // Remove trailing slash if present
    return apiUrl.replace(/\/$/, '')
  }
  
  // Development mode: use localhost backend
  return 'http://localhost:4004'
}

/**
 * Get the full URL for a given API endpoint
 * @param {string} endpoint - API endpoint path (e.g., '/api/auth/login')
 * @returns {string} Full URL for the endpoint
 */
export const getApiUrl = (endpoint) => {
  const baseUrl = getApiBaseUrl()
  // Ensure endpoint starts with /
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return baseUrl ? `${baseUrl}${path}` : path
}


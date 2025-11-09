/**
 * API Configuration
 * Centralized configuration for backend API URL
 * 
 * In development: Uses relative paths (works with Vite proxy)
 * In production: Uses VITE_API_BASE_URL environment variable
 * 
 * Usage:
 *   import { getApiBaseUrl } from '../config/api'
 *   const response = await fetch(`${getApiBaseUrl()}/api/endpoint`)
 */

/**
 * Get the base URL for API requests
 * @returns {string} Base URL for API requests (empty string for relative paths in dev)
 */
export const getApiBaseUrl = () => {
  // In production, use environment variable
  if (import.meta.env.PROD) {
    // If VITE_API_BASE_URL is set, use it (remove trailing slash if present)
    const apiUrl = import.meta.env.VITE_API_BASE_URL || ''
    return apiUrl.replace(/\/$/, '')
  }
  
  // In development, return empty string to use relative paths (Vite proxy handles it)
  // OR return full URL if you need to bypass proxy for some reason
  // For now, we'll use empty string to leverage Vite proxy
  return ''
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


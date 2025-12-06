import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from './security/AuthContext'
import { getApiUrl } from '../config/api'

const UserConfigContext = createContext()

export const useUserConfig = () => {
  const context = useContext(UserConfigContext)
  if (!context) {
    throw new Error('useUserConfig must be used within a UserConfigProvider')
  }
  return context
}

export const UserConfigProvider = ({ children }) => {
  const { authenticatedFetch, isAuthenticated, user } = useAuth()
  const [configs, setConfigs] = useState([])
  const [configsMap, setConfigsMap] = useState({}) // Map for quick lookup by name
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const loadingPromiseRef = useRef(null) // Prevent multiple simultaneous loads

  // Get user ID
  const getUserId = useCallback(() => {
    return user?.email || user?.id || null
  }, [user])

  // Load configurations from API
  const loadConfigs = useCallback(async (forceReload = false) => {
    const userId = getUserId()
    
    // If already loading, return the existing promise
    if (loadingPromiseRef.current && !forceReload) {
      return loadingPromiseRef.current
    }

    if (!userId || !isAuthenticated) {
      setConfigs([])
      setConfigsMap({})
      setIsInitialized(true)
      return
    }

    // Create the load promise
    loadingPromiseRef.current = (async () => {
      setIsLoading(true)
      try {
        const response = await authenticatedFetch(getApiUrl('/api/user-configs'), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          mode: 'cors'
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        
        if (data.success) {
          const configsList = data.configs || []
          setConfigs(configsList)
          
          // Create a map for quick lookup by name
          const map = {}
          configsList.forEach(config => {
            if (!map[config.name]) {
              map[config.name] = []
            }
            map[config.name].push(config)
          })
          setConfigsMap(map)
          
          setIsInitialized(true)
          return { success: true, configs: configsList }
        } else {
          throw new Error(data.error || 'Failed to load configurations')
        }
      } catch (error) {
        console.error('Error loading user configurations:', error)
        setConfigs([])
        setConfigsMap({})
        setIsInitialized(true)
        return { success: false, error: error.message }
      } finally {
        setIsLoading(false)
        loadingPromiseRef.current = null
      }
    })()

    return loadingPromiseRef.current
  }, [authenticatedFetch, isAuthenticated, getUserId])

  // Invalidate and reload configurations
  const invalidateAndReload = useCallback(async () => {
    return await loadConfigs(true)
  }, [loadConfigs])

  // Get a configuration value by name (returns the first match if multiple exist)
  const getConfig = useCallback((name) => {
    if (!name || !configsMap[name] || configsMap[name].length === 0) {
      return null
    }
    return configsMap[name][0]
  }, [configsMap])

  // Get all configurations with a given name
  const getConfigsByName = useCallback((name) => {
    if (!name || !configsMap[name]) {
      return []
    }
    return configsMap[name]
  }, [configsMap])

  // Get configuration value by name (returns the value directly)
  const getConfigValue = useCallback((name, defaultValue = null) => {
    const config = getConfig(name)
    if (!config) {
      return defaultValue
    }
    
    // Parse value based on type
    try {
      switch (config.value_type) {
        case 'number':
          return config.value ? Number(config.value) : defaultValue
        case 'boolean':
          return config.value === 'true' ? true : config.value === 'false' ? false : defaultValue
        case 'json':
          return config.value ? JSON.parse(config.value) : defaultValue
        case 'string':
        default:
          return config.value || defaultValue
      }
    } catch (error) {
      console.error(`Error parsing config value for "${name}":`, error)
      return defaultValue
    }
  }, [getConfig])

  // Check if a configuration exists
  const hasConfig = useCallback((name) => {
    return !!(name && configsMap[name] && configsMap[name].length > 0)
  }, [configsMap])

  // Load configs when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && !isInitialized && !isLoading) {
      loadConfigs()
    }
  }, [isAuthenticated, isInitialized, isLoading, loadConfigs])

  // Reset configs when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setConfigs([])
      setConfigsMap({})
      setIsInitialized(false)
      loadingPromiseRef.current = null
    }
  }, [isAuthenticated])

  const value = {
    configs,
    configsMap,
    isLoading,
    isInitialized,
    loadConfigs,
    invalidateAndReload,
    getConfig,
    getConfigsByName,
    getConfigValue,
    hasConfig
  }

  return (
    <UserConfigContext.Provider value={value}>
      {children}
    </UserConfigContext.Provider>
  )
}

export default UserConfigContext


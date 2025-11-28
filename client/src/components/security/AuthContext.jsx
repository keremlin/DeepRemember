import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getApiUrl } from '../../config/api';

const AuthContext = createContext();

// Helper function to decode JWT token
const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

// Check if token is expired or will expire soon (within 5 minutes)
const isTokenExpiringSoon = (token) => {
  if (!token) return true;
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return true;
  
  const expirationTime = decoded.exp * 1000; // Convert to milliseconds
  const currentTime = Date.now();
  const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  return expirationTime - currentTime < fiveMinutes;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);
  const refreshPromiseRef = useRef(null); // Prevent multiple simultaneous refresh calls
  const navigateToLoginRef = useRef(null); // Callback to navigate to login page

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('access_token');
        
        if (storedUser && storedToken) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setAccessToken(storedToken);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear invalid data
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Periodic token refresh check (every 5 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkAndRefreshToken = async () => {
      const currentToken = localStorage.getItem('access_token');
      if (currentToken && isTokenExpiringSoon(currentToken)) {
        console.log('Token expiring soon, refreshing proactively...');
        const refreshTokenValue = localStorage.getItem('refresh_token');
        if (refreshTokenValue) {
          try {
            const response = await fetch(getApiUrl('/api/auth/refresh-token'), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refresh_token: refreshTokenValue }),
            });

            const data = await response.json();

            if (data.success && data.session) {
              const newToken = data.session.access_token;
              const newRefreshToken = data.session.refresh_token;

              localStorage.setItem('access_token', newToken);
              if (newRefreshToken) {
                localStorage.setItem('refresh_token', newRefreshToken);
              }

              setAccessToken(newToken);
              if (data.user) {
                setUser(data.user);
                localStorage.setItem('user', JSON.stringify(data.user));
              }
      } else {
        // Refresh failed, clear tokens and logout
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        setAccessToken(null);
        setIsAuthenticated(false);
        redirectToLogin();
      }
    } catch (error) {
      console.error('Periodic token refresh error:', error);
      // Clear tokens and logout
      localStorage.removeItem('user');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      setAccessToken(null);
      setIsAuthenticated(false);
      redirectToLogin();
    }
        }
      }
    };

    // Check immediately
    checkAndRefreshToken();

    // Set up interval to check every 5 minutes
    const interval = setInterval(checkAndRefreshToken, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Login function
  const login = async (email, password) => {
    try {
      const response = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        const userData = data.user;
        const token = data.session?.access_token;
        
        // Store in localStorage
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('access_token', token);
        if (data.session?.refresh_token) {
          localStorage.setItem('refresh_token', data.session.refresh_token);
        }
        
        // Update state
        setUser(userData);
        setAccessToken(token);
        setIsAuthenticated(true);
        
        return { success: true, user: userData };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  // Register function
  const register = async (email, password) => {
    try {
      const response = await fetch(getApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        const userData = data.user;
        const token = data.session?.access_token;
        
        // Store in localStorage
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('access_token', token);
        if (data.session?.refresh_token) {
          localStorage.setItem('refresh_token', data.session.refresh_token);
        }
        
        // Update state
        setUser(userData);
        setAccessToken(token);
        setIsAuthenticated(true);
        
        return { success: true, user: userData };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  // Set navigation callback for redirecting to login
  const setNavigateToLogin = (callback) => {
    navigateToLoginRef.current = callback;
  };

  // Helper function to redirect to login page
  const redirectToLogin = () => {
    if (navigateToLoginRef.current) {
      navigateToLoginRef.current();
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout endpoint if token exists
      if (accessToken) {
        await fetch(getApiUrl('/api/auth/logout'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with local logout even if API call fails
    } finally {
      // Clear localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      
      // Update state
      setUser(null);
      setAccessToken(null);
      setIsAuthenticated(false);
      
      // Redirect to login page
      redirectToLogin();
    }
  };

  // Get current user info
  const getCurrentUser = async () => {
    try {
      const response = await authenticatedFetch(getApiUrl('/api/auth/me'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        return { success: true, user: data.user };
      } else {
        // Token might be invalid, logout
        logout();
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Get current user error:', error);
      if (error.message !== 'Session expired. Please login again.') {
        logout();
      }
      return { success: false, error: error.message || 'Network error' };
    }
  };

  // Refresh access token using refresh token
  const refreshToken = async () => {
    // If a refresh is already in progress, wait for it
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const refreshTokenValue = localStorage.getItem('refresh_token');
    if (!refreshTokenValue) {
      console.warn('No refresh token available');
      return { success: false, error: 'No refresh token available' };
    }

    // Create the refresh promise
    refreshPromiseRef.current = (async () => {
      try {
        const response = await fetch(getApiUrl('/api/auth/refresh-token'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshTokenValue }),
        });

        const data = await response.json();

        if (data.success && data.session) {
          const newToken = data.session.access_token;
          const newRefreshToken = data.session.refresh_token;

          // Update stored tokens
          localStorage.setItem('access_token', newToken);
          if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken);
          }

          // Update state
          setAccessToken(newToken);
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          }

          return { success: true, token: newToken };
        } else {
          // Refresh failed, clear tokens and logout
          localStorage.removeItem('user');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setUser(null);
          setAccessToken(null);
          setIsAuthenticated(false);
          redirectToLogin();
          return { success: false, error: data.error || 'Token refresh failed' };
        }
      } catch (error) {
        console.error('Token refresh error:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        setAccessToken(null);
        setIsAuthenticated(false);
        redirectToLogin();
        return { success: false, error: 'Network error during token refresh' };
      } finally {
        // Clear the promise reference
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  };

  // Ensure token is valid, refresh if needed
  const ensureValidToken = async () => {
    const currentToken = accessToken || localStorage.getItem('access_token');
    
    if (!currentToken) {
      return { success: false, error: 'No access token' };
    }

    // Check if token is expiring soon
    if (isTokenExpiringSoon(currentToken)) {
      console.log('Token expiring soon, refreshing...');
      return await refreshToken();
    }

    return { success: true, token: currentToken };
  };

  // Verify token validity
  const verifyToken = async () => {
    if (!accessToken) {
      return false;
    }

    try {
      const response = await fetch(getApiUrl('/api/auth/verify-token'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: accessToken }),
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  };

  // Get auth headers for API calls (with automatic token refresh)
  const getAuthHeaders = async () => {
    const tokenResult = await ensureValidToken();
    if (!tokenResult.success || !tokenResult.token) {
      return {};
    }
    return {
      'Authorization': `Bearer ${tokenResult.token}`,
    };
  };

  // Enhanced fetch wrapper that handles token refresh on 401 errors
  const authenticatedFetch = async (url, options = {}) => {
    // Ensure we have a valid token before making the request
    const tokenResult = await ensureValidToken();
    if (!tokenResult.success || !tokenResult.token) {
      throw new Error('Authentication required');
    }

    // Add authorization header
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${tokenResult.token}`,
    };

    // Make the request
    let response = await fetch(url, {
      ...options,
      headers,
    });

    // If we get a 401, try to refresh the token and retry once
    if (response.status === 401) {
      console.log('Received 401, attempting to refresh token...');
      const refreshResult = await refreshToken();

      if (refreshResult.success && refreshResult.token) {
        // Retry the request with the new token
        headers['Authorization'] = `Bearer ${refreshResult.token}`;
        response = await fetch(url, {
          ...options,
          headers,
        });
      } else {
        // Refresh failed, user needs to login again
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        setAccessToken(null);
        setIsAuthenticated(false);
        redirectToLogin();
        throw new Error('Session expired. Please login again.');
      }
    }

    return response;
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    accessToken,
    login,
    register,
    logout,
    getCurrentUser,
    verifyToken,
    getAuthHeaders,
    refreshToken,
    ensureValidToken,
    authenticatedFetch,
    setNavigateToLogin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

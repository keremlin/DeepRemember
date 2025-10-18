import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

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

  // Login function
  const login = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
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
      const response = await fetch('/api/auth/register', {
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

  // Logout function
  const logout = async () => {
    try {
      // Call logout endpoint if token exists
      if (accessToken) {
        await fetch('/api/auth/logout', {
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
    }
  };

  // Get current user info
  const getCurrentUser = async () => {
    if (!accessToken) {
      return { success: false, error: 'No access token' };
    }

    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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
      logout();
      return { success: false, error: 'Network error' };
    }
  };

  // Verify token validity
  const verifyToken = async () => {
    if (!accessToken) {
      return false;
    }

    try {
      const response = await fetch('/api/auth/verify-token', {
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

  // Get auth headers for API calls
  const getAuthHeaders = () => {
    if (!accessToken) {
      return {};
    }
    return {
      'Authorization': `Bearer ${accessToken}`,
    };
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

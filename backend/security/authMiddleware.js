const AuthService = require('./authService');

/**
 * Authentication Middleware
 */
class AuthMiddleware {
  constructor() {
    try {
      this.authService = new AuthService();
    } catch (error) {
      console.warn('[AuthMiddleware] AuthService initialization failed:', error.message);
      this.authService = null;
    }
    
    // Bind methods to ensure proper 'this' context
    this.verifyToken = this.verifyToken.bind(this);
    this.checkResourceOwnership = this.checkResourceOwnership.bind(this);
    this.verifyAdmin = this.verifyAdmin.bind(this);
  }

  /**
   * Middleware to verify JWT token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async verifyToken(req, res, next) {
    try {
      if (!this.authService || !this.authService.isInitialized) {
        return res.status(503).json({
          success: false,
          error: 'Authentication service not available'
        });
      }

      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'No token provided or invalid format'
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      const result = await this.authService.verifyToken(token);
      
      if (!result.success) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }

      // Add user info to request object
      req.user = result.user;
      req.userId = result.user.email; // Use email as user_id for database operations
      req.userEmail = result.user.email;
      req.supabaseUserId = result.user.id; // Keep original Supabase user ID for auth operations
      
      next();
    } catch (error) {
      console.error('[AuthMiddleware] Token verification error:', error);
      return res.status(401).json({
        success: false,
        error: 'Authentication failed'
      });
    }
  }

  /**
   * Middleware to verify admin user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async verifyAdmin(req, res, next) {
    try {
      // First verify the token
      await this.verifyToken(req, res, (err) => {
        if (err) return next(err);
        
        // Check if user is admin (you can customize this logic)
        const isAdmin = req.userEmail === 'admin@example.com' || 
                       req.user.user_metadata?.role === 'admin';
        
        if (!isAdmin) {
          return res.status(403).json({
            success: false,
            error: 'Admin access required'
          });
        }
        
        next();
      });
    } catch (error) {
      console.error('[AuthMiddleware] Admin verification error:', error);
      return res.status(403).json({
        success: false,
        error: 'Admin verification failed'
      });
    }
  }

  /**
   * Optional authentication middleware (doesn't fail if no token)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        req.userId = null;
        req.userEmail = null;
        return next();
      }

      const token = authHeader.substring(7);
      const result = await this.authService.verifyToken(token);
      
      if (result.success) {
        req.user = result.user;
        req.userId = result.user.id;
        req.userEmail = result.user.email;
      } else {
        req.user = null;
        req.userId = null;
        req.userEmail = null;
      }
      
      next();
    } catch (error) {
      console.error('[AuthMiddleware] Optional auth error:', error);
      req.user = null;
      req.userId = null;
      req.userEmail = null;
      next();
    }
  }

  /**
   * Middleware to check if user owns the resource
   * @param {string} userIdParam - Parameter name containing user ID
   * @returns {Function} Middleware function
   */
  checkResourceOwnership(userIdParam = 'userId') {
    return (req, res, next) => {
      try {
        const resourceUserId = req.params[userIdParam] || req.body[userIdParam];
        
        if (!resourceUserId) {
          return res.status(400).json({
            success: false,
            error: 'User ID parameter missing'
          });
        }

        if (req.userId !== resourceUserId) {
          return res.status(403).json({
            success: false,
            error: 'Access denied: You can only access your own resources'
          });
        }

        next();
      } catch (error) {
        console.error('[AuthMiddleware] Resource ownership check error:', error);
        return res.status(500).json({
          success: false,
          error: 'Resource ownership verification failed'
        });
      }
    };
  }

  /**
   * Error handler for authentication errors
   * @param {Error} error - Error object
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  authErrorHandler(error, req, res, next) {
    console.error('[AuthMiddleware] Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
}

module.exports = AuthMiddleware;

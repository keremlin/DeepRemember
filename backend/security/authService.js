const { createClient } = require('@supabase/supabase-js');
const UserManagementService = require('./userManagementService');

/**
 * Authentication Service using Supabase Auth
 */
class AuthService {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      console.warn('[AuthService] Supabase credentials not configured. Authentication will not work.');
      console.warn('[AuthService] Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file');
      this.client = null;
      this.userClient = null;
      this.userManagementService = null;
      this.isInitialized = false;
      return;
    }

    // Create client for server-side operations
    this.client = createClient(this.supabaseUrl, this.supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    });

    // Create client for user operations (with anon key)
    this.userClient = createClient(this.supabaseUrl, this.supabaseAnonKey, {
      auth: {
        persistSession: false
      }
    });

    // Initialize user management service
    this.userManagementService = new UserManagementService();
    this.isInitialized = true;
  }

  /**
   * Register a new user
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Promise<Object>} Registration result
   */
  async registerUser(email, password) {
    try {
      if (!this.userClient) {
        return {
          success: false,
          error: 'Authentication service not configured. Please set up Supabase credentials.'
        };
      }

      const { data, error } = await this.userClient.auth.signUp({
        email: email.toLowerCase().trim(),
        password: password,
        options: {
          emailRedirectTo: `${process.env.CLIENT_URL || 'http://localhost:9000'}?type=signup&token={{token}}`
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        user: data.user,
        session: data.session
      };
    } catch (error) {
      console.error('[AuthService] Registration error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Login user
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Promise<Object>} Login result
   */
  async loginUser(email, password) {
    try {
      if (!this.userClient) {
        return {
          success: false,
          error: 'Authentication service not configured. Please set up Supabase credentials.'
        };
      }

      const { data, error } = await this.userClient.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password
      });

      if (error) {
        throw new Error(error.message);
      }

      // Ensure user record exists in database
      if (this.userManagementService) {
        const userRecordResult = await this.userManagementService.ensureUserExists(data.user.email);
        if (!userRecordResult.success) {
          console.warn('[AuthService] Failed to ensure user record exists:', userRecordResult.error);
        }
      }

      return {
        success: true,
        user: data.user,
        session: data.session
      };
    } catch (error) {
      console.error('[AuthService] Login error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Logout user
   * @param {string} accessToken - User's access token
   * @returns {Promise<Object>} Logout result
   */
  async logoutUser(accessToken) {
    try {
      // Set the session for this client
      const { error } = await this.userClient.auth.signOut();

      return {
        success: !error,
        error: error?.message
      };
    } catch (error) {
      console.error('[AuthService] Logout error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify JWT token and get user info
   * @param {string} token - JWT access token
   * @returns {Promise<Object>} User verification result
   */
  async verifyToken(token) {
    try {
      const { data, error } = await this.client.auth.getUser(token);

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        user: data.user
      };
    } catch (error) {
      console.error('[AuthService] Token verification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user by ID
   * @param {string} userId - User's ID
   * @returns {Promise<Object>} User data
   */
  async getUserById(userId) {
    try {
      const { data, error } = await this.client.auth.admin.getUserById(userId);

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        user: data.user
      };
    } catch (error) {
      console.error('[AuthService] Get user error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update user password
   * @param {string} userId - User's ID
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Update result
   */
  async updateUserPassword(userId, newPassword) {
    try {
      const { data, error } = await this.client.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        user: data.user
      };
    } catch (error) {
      console.error('[AuthService] Password update error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete user
   * @param {string} userId - User's ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteUser(userId) {
    try {
      const { error } = await this.client.auth.admin.deleteUser(userId);

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('[AuthService] Delete user error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Reset password (send reset email)
   * @param {string} email - User's email
   * @returns {Promise<Object>} Reset result
   */
  async resetPassword(email) {
    try {
      if (!this.userClient) {
        return {
          success: false,
          error: 'Authentication service not configured. Please set up Supabase credentials.'
        };
      }

      const { error } = await this.userClient.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
        redirectTo: `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password`
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        message: 'Password reset email sent'
      };
    } catch (error) {
      console.error('[AuthService] Password reset error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Confirm email and create user record
   * @param {string} token - Confirmation token
   * @returns {Promise<Object>} Confirmation result
   */
  async confirmEmail(token) {
    try {
      if (!this.userClient || !this.userManagementService) {
        return {
          success: false,
          error: 'Authentication service not configured'
        };
      }

      // Verify the confirmation token
      const { data, error } = await this.userClient.auth.verifyOtp({
        token_hash: token,
        type: 'signup'
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user || !data.user.email) {
        throw new Error('Invalid confirmation token');
      }

      // Create user record in database
      const userRecordResult = await this.userManagementService.createUserRecord(data.user.email);

      if (!userRecordResult.success) {
        console.warn('[AuthService] Failed to create user record:', userRecordResult.error);
        // Don't fail the confirmation if user record creation fails
      }

      return {
        success: true,
        user: data.user,
        session: data.session,
        userRecord: userRecordResult.success ? userRecordResult.user : null
      };
    } catch (error) {
      console.error('[AuthService] Email confirmation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Resend email confirmation
   * @param {string} email - User's email
   * @returns {Promise<Object>} Resend result
   */
  async resendConfirmation(email) {
    try {
      if (!this.userClient) {
        return {
          success: false,
          error: 'Authentication service not configured. Please set up Supabase credentials.'
        };
      }

      const { error } = await this.userClient.auth.resend({
        type: 'signup',
        email: email.toLowerCase().trim()
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        message: 'Confirmation email sent'
      };
    } catch (error) {
      console.error('[AuthService] Resend confirmation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = AuthService;

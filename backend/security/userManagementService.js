const { createClient } = require('@supabase/supabase-js');

/**
 * User Management Service for Database Operations
 */
class UserManagementService {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!this.supabaseUrl || !this.supabaseServiceKey) {
      console.warn('[UserManagementService] Supabase credentials not configured.');
      this.client = null;
      return;
    }

    // Create client for database operations
    this.client = createClient(this.supabaseUrl, this.supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    });
  }

  /**
   * Create a user record in the users table
   * @param {string} email - User's email address
   * @returns {Promise<Object>} Creation result
   */
  async createUserRecord(email) {
    try {
      if (!this.client) {
        return {
          success: false,
          error: 'User management service not configured'
        };
      }

      // Check if user already exists
      const { data: existingUser, error: checkError } = await this.client
        .from('users')
        .select('user_id')
        .eq('user_id', email)
        .single();

      if (existingUser) {
        return {
          success: true,
          message: 'User already exists',
          user: existingUser
        };
      }

      // Create new user record
      const { data, error } = await this.client
        .from('users')
        .insert({
          user_id: email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        message: 'User record created successfully',
        user: data
      };
    } catch (error) {
      console.error('[UserManagementService] Create user record error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user record by email
   * @param {string} email - User's email address
   * @returns {Promise<Object>} User data
   */
  async getUserRecord(email) {
    try {
      if (!this.client) {
        return {
          success: false,
          error: 'User management service not configured'
        };
      }

      const { data, error } = await this.client
        .from('users')
        .select('*')
        .eq('user_id', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // User not found
          return {
            success: false,
            error: 'User not found'
          };
        }
        throw new Error(error.message);
      }

      return {
        success: true,
        user: data
      };
    } catch (error) {
      console.error('[UserManagementService] Get user record error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update user record
   * @param {string} email - User's email address
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Update result
   */
  async updateUserRecord(email, updates) {
    try {
      if (!this.client) {
        return {
          success: false,
          error: 'User management service not configured'
        };
      }

      const { data, error } = await this.client
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', email)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        user: data
      };
    } catch (error) {
      console.error('[UserManagementService] Update user record error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete user record and all associated data
   * @param {string} email - User's email address
   * @returns {Promise<Object>} Delete result
   */
  async deleteUserRecord(email) {
    try {
      if (!this.client) {
        return {
          success: false,
          error: 'User management service not configured'
        };
      }

      // Delete user record (cascade will handle cards and labels)
      const { error } = await this.client
        .from('users')
        .delete()
        .eq('user_id', email);

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        message: 'User record and all associated data deleted'
      };
    } catch (error) {
      console.error('[UserManagementService] Delete user record error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Ensure user exists in database (create if not exists)
   * @param {string} email - User's email address
   * @returns {Promise<Object>} Result
   */
  async ensureUserExists(email) {
    try {
      // First check if user exists
      const getResult = await this.getUserRecord(email);
      
      if (getResult.success) {
        return {
          success: true,
          message: 'User already exists',
          user: getResult.user
        };
      }

      // User doesn't exist, create it
      return await this.createUserRecord(email);
    } catch (error) {
      console.error('[UserManagementService] Ensure user exists error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = UserManagementService;

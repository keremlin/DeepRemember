const express = require('express');
const AuthService = require('../security/authService');
const AuthMiddleware = require('../security/authMiddleware');

const router = express.Router();
const authService = new AuthService();
const authMiddleware = new AuthMiddleware();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    const result = await authService.registerUser(email, password);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: result.user.id,
        email: result.user.email,
        created_at: result.user.created_at
      },
      session: result.session
    });
  } catch (error) {
    console.error('[AuthRoutes] Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const result = await authService.loginUser(email, password);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: result.user.id,
        email: result.user.email,
        created_at: result.user.created_at
      },
      session: result.session
    });
  } catch (error) {
    console.error('[AuthRoutes] Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post('/logout', authMiddleware.verifyToken, async (req, res) => {
  try {
    const result = await authService.logoutUser();

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('[AuthRoutes] Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

/**
 * @route GET /api/auth/me
 * @desc Get current user info
 * @access Private
 */
router.get('/me', authMiddleware.verifyToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        created_at: req.user.created_at,
        last_sign_in_at: req.user.last_sign_in_at
      }
    });
  } catch (error) {
    console.error('[AuthRoutes] Get user info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user info'
    });
  }
});

/**
 * @route POST /api/auth/reset-password
 * @desc Send password reset email
 * @access Public
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const result = await authService.resetPassword(email);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('[AuthRoutes] Password reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Password reset failed'
    });
  }
});

/**
 * @route PUT /api/auth/change-password
 * @desc Change user password
 * @access Private
 */
router.put('/change-password', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long'
      });
    }

    // Note: Supabase doesn't provide a direct way to verify current password
    // This would require additional implementation or using Supabase's built-in password change
    const result = await authService.updateUserPassword(req.userId, newPassword);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('[AuthRoutes] Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Password change failed'
    });
  }
});

/**
 * @route DELETE /api/auth/account
 * @desc Delete user account
 * @access Private
 */
router.delete('/account', authMiddleware.verifyToken, async (req, res) => {
  try {
    const result = await authService.deleteUser(req.userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('[AuthRoutes] Delete account error:', error);
    res.status(500).json({
      success: false,
      error: 'Account deletion failed'
    });
  }
});

/**
 * @route POST /api/auth/confirm-email
 * @desc Confirm email and create user record
 * @access Public
 */
router.post('/confirm-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Confirmation token is required'
      });
    }

    const result = await authService.confirmEmail(token);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Email confirmed successfully',
      user: {
        id: result.user.id,
        email: result.user.email,
        email_confirmed_at: result.user.email_confirmed_at
      },
      session: result.session,
      userRecord: result.userRecord
    });
  } catch (error) {
    console.error('[AuthRoutes] Email confirmation error:', error);
    res.status(500).json({
      success: false,
      error: 'Email confirmation failed'
    });
  }
});

/**
 * @route POST /api/auth/resend-confirmation
 * @desc Resend email confirmation
 * @access Public
 */
router.post('/resend-confirmation', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const result = await authService.resendConfirmation(email);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('[AuthRoutes] Resend confirmation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend confirmation email'
    });
  }
});

/**
 * @route POST /api/auth/verify-token
 * @desc Verify JWT token
 * @access Public
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    const result = await authService.verifyToken(token);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        created_at: result.user.created_at
      }
    });
  } catch (error) {
    console.error('[AuthRoutes] Token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Token verification failed'
    });
  }
});

/**
 * @route POST /api/auth/refresh-token
 * @desc Refresh access token using refresh token
 * @access Public
 */
router.post('/refresh-token', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    const result = await authService.refreshToken(refresh_token);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      session: result.session,
      user: {
        id: result.user.id,
        email: result.user.email,
        created_at: result.user.created_at
      }
    });
  } catch (error) {
    console.error('[AuthRoutes] Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
});

module.exports = router;

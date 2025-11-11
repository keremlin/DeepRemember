import React from 'react'
import { useAuth } from './AuthContext'
import './UserInfo.css'

const UserInfo = ({ onUserSetup }) => {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout()
    }
  }

  const handleUserSetup = () => {
    if (onUserSetup) {
      onUserSetup()
    }
  }

  const getDisplayText = () => {
    if (!user?.email) return 'Not logged in'
    const email = user.email
    // Show first part of email or truncate if too long
    return email.length > 15 ? email.substring(0, 12) + '...' : email
  }

  return (
    <div className="user-info">
      <div 
        className="user-info-item" 
        onClick={handleUserSetup} 
        title={user?.email || 'Not logged in'}
      >
        <div className="user-info-icon">
          <span className="material-symbols-outlined">person</span>
        </div>
        <div className="user-info-label">{getDisplayText()}</div>
      </div>
      <div 
        className="user-info-item logout-item" 
        onClick={handleLogout} 
        title="Logout"
      >
        <div className="user-info-icon">
          <span className="material-symbols-outlined">logout</span>
        </div>
        <div className="user-info-label">Logout</div>
      </div>
    </div>
  )
}

export default UserInfo

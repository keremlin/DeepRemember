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

  return (
    <div className="user-info">
      <div className="username-display" onClick={handleUserSetup} title={user?.email || 'Not logged in'}>
        👤 <span>{user?.email || 'Not logged in'}</span>
      </div>
      <button className="logout-btn" onClick={handleLogout} title="Logout">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    </div>
  )
}

export default UserInfo

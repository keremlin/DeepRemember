import React from 'react'
import { useAuth } from './AuthContext'
import logoutIcon from '../../assets/icons/logout_icon.png'
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
        <img src={logoutIcon} alt="Logout" className="logout-icon" />
      </button>
    </div>
  )
}

export default UserInfo

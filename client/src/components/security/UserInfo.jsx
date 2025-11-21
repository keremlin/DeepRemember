import React, { useState } from 'react'
import { useAuth } from './AuthContext'
import AreYouSureModal from '../AreYouSureModal'
import './UserInfo.css'

const UserInfo = ({ onUserSetup }) => {
  const { user, logout } = useAuth()
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true)
  }

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      setIsLoggingOut(false)
      setIsLogoutModalOpen(false)
    }
  }

  const handleCancelLogout = () => {
    setIsLogoutModalOpen(false)
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
    <>
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
          onClick={handleLogoutClick} 
          title="Logout"
        >
          <div className="user-info-icon">
            <span className="material-symbols-outlined">logout</span>
          </div>
          <div className="user-info-label">Logout</div>
        </div>
      </div>

      <AreYouSureModal
        isOpen={isLogoutModalOpen}
        question="Are you sure you want to logout?"
        confirmLabel={isLoggingOut ? 'Logging out...' : 'Yes, logout'}
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
        isConfirming={isLoggingOut}
        confirmButtonVariant="primary"
      />
    </>
  )
}

export default UserInfo

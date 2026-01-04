import React, { useState } from 'react'
import { useAuth } from '../security/AuthContext'
import AreYouSureModal from '../AreYouSureModal'
import './RadialMenu.css'

const RadialMenu = ({ onNavigateToDeepRemember, onNavigateToPlayer, onNavigateToManagement, onNavigateToChat, onNavigateToUserManagement, onNavigateToWordList, onNavigateToCourses }) => {
  const [isOpen, setIsOpen] = useState(true)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { logout } = useAuth()

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      setIsLoggingOut(false)
      setShowLogoutConfirm(false)
    }
  }

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false)
  }

  const menuItems = [
    {
      id: 'play-pause',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5,3 19,12 5,21"/>
        </svg>
      ),
      label: 'Audio Player',
      action: () => console.log('Audio Player clicked')
    },
    {
      id: 'new-note',
      icon: (
        <span className="material-symbols-outlined">style</span>
      ),
      label: 'Cards',
      action: () => console.log('Cards clicked')
    },
    {
      id: 'user',
      icon: (
        <span className="material-symbols-outlined">person</span>
      ),
      label: 'User',
      action: () => console.log('User clicked')
    },
    {
      id: 'word-list',
      icon: (
        <span className="material-symbols-outlined">menu_book</span>
      ),
      label: 'Words',
      action: () => console.log('Words clicked')
    },
    {
      id: 'logi-options',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      ),
      label: 'Logout',
      action: handleLogout
    },
    {
      id: 'courses',
      icon: (
        <span className="material-symbols-outlined">school</span>
      ),
      label: 'Courses',
      action: () => console.log('Courses clicked')
    },
    {
      id: 'chat',
      icon: (
        <span className="material-symbols-outlined">chat</span>
      ),
      label: 'Chat',
      action: () => console.log('Chat clicked')
    },
    {
      id: 'management',
      icon: (
        <span className="material-symbols-outlined">settings</span>
      ),
      label: 'Management',
      action: () => console.log('Management clicked')
    }
  ]

  const handleMenuToggle = () => {
    setIsOpen(!isOpen)
  }

  const handleItemClick = (item) => {
    if (item.id === 'new-note') {
      // Navigate to DeepRemember when "Cards" is clicked
      if (onNavigateToDeepRemember) {
        onNavigateToDeepRemember()
      }
    } else if (item.id === 'play-pause') {
      // Navigate to Audio Player when "Audio Player" is clicked
      if (onNavigateToPlayer) {
        onNavigateToPlayer()
      }
    } else if (item.id === 'management') {
      // Navigate to Management page
      if (onNavigateToManagement) {
        onNavigateToManagement()
      }
    } else if (item.id === 'chat') {
      // Navigate to Chat page
      if (onNavigateToChat) {
        onNavigateToChat()
      }
    } else if (item.id === 'user') {
      // Navigate to User Management page
      if (onNavigateToUserManagement) {
        onNavigateToUserManagement()
      }
    } else if (item.id === 'word-list') {
      // Navigate to Word List page
      if (onNavigateToWordList) {
        onNavigateToWordList()
      }
    } else if (item.id === 'courses') {
      // Navigate to Courses page
      if (onNavigateToCourses) {
        onNavigateToCourses()
      }
    } else {
      item.action()
    }
    setIsOpen(false)
  }

  return (
    <>
      <div className="radial-menu-container">
        <div className="radial-menu">
          {/* Center close button */}
          <button 
            className={`center-button ${isOpen ? 'open' : ''}`}
            onClick={handleMenuToggle}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </button>

          {/* Menu items */}
          {menuItems.map((item, index) => {
            const angle = (index * 45) - 90 // Start from top, 45 degrees apart
            const radius = 120 // Distance from center
            const x = Math.cos(angle * Math.PI / 180) * radius
            const y = Math.sin(angle * Math.PI / 180) * radius

            return (
              <div
                key={item.id}
                className={`menu-item ${isOpen ? 'open' : ''}`}
                style={{
                  '--x': `${x}px`,
                  '--y': `${y}px`,
                  '--delay': `${index * 0.1}s`
                }}
                onClick={() => handleItemClick(item)}
              >
                <div className="menu-button">
                  {item.icon}
                </div>
                <span className="menu-label">{item.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      <AreYouSureModal
        isOpen={showLogoutConfirm}
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

export default RadialMenu

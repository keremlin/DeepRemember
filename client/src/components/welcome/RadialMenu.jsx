import React, { useState } from 'react'
import './RadialMenu.css'

const RadialMenu = ({ onNavigateToDeepRemember, onNavigateToPlayer }) => {
  const [isOpen, setIsOpen] = useState(true)

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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
      ),
      label: 'Cards',
      action: () => console.log('Cards clicked')
    },
    {
      id: 'explore-ai',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ),
      label: 'Explore AI',
      action: () => console.log('Explore AI clicked')
    },
    {
      id: 'lock-workstation',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <circle cx="12" cy="16" r="1"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      ),
      label: 'Lock Workstation',
      action: () => console.log('Lock Workstation clicked')
    },
    {
      id: 'logi-options',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <text x="8" y="10" fontSize="8" fill="currentColor">0</text>
          <text x="16" y="10" fontSize="8" fill="currentColor">1</text>
        </svg>
      ),
      label: 'Logi Options+',
      action: () => console.log('Logi Options+ clicked')
    },
    {
      id: 'screenshot',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21,15 16,10 5,21"/>
        </svg>
      ),
      label: 'Windows Screenshot',
      action: () => console.log('Windows Screenshot clicked')
    },
    {
      id: 'emoji',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
          <line x1="9" y1="9" x2="9.01" y2="9"/>
          <line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>
      ),
      label: 'Emoji',
      action: () => console.log('Emoji clicked')
    },
    {
      id: 'explorer',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
      ),
      label: 'Windows Explorer',
      action: () => console.log('Windows Explorer clicked')
    }
  ]

  const handleMenuToggle = () => {
    setIsOpen(!isOpen)
  }

  const handleItemClick = (item) => {
    if (item.id === 'explore-ai' || item.id === 'new-note') {
      // Navigate to DeepRemember when "Explore AI" or "Cards" is clicked
      if (onNavigateToDeepRemember) {
        onNavigateToDeepRemember()
      }
    } else if (item.id === 'play-pause') {
      // Navigate to Audio Player when "Audio Player" is clicked
      if (onNavigateToPlayer) {
        onNavigateToPlayer()
      }
    } else {
      item.action()
    }
    setIsOpen(false)
  }

  return (
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
  )
}

export default RadialMenu

import React from 'react'
import './TopMenu.css'

const TopMenuButton = ({ icon, label, active = false, link, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (link) {
      window.location.href = link
    }
  }

  return (
    <div 
      className={`top-menu-item ${active ? 'active' : ''}`}
      onClick={handleClick}
    >
      <div className="top-menu-icon">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div className="top-menu-label">{label}</div>
    </div>
  )
}

export default TopMenuButton


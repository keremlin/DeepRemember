import React from 'react'
import CloseButton from '../../CloseButton'
import './UserManage.css'

const UserManage = ({ 
  isOpen, 
  onClose, 
  currentUserId, 
  onUserIdChange, 
  onLoadUserData 
}) => {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>👤 User Setup</h3>
          <CloseButton onClick={onClose} size="small" variant="default" />
        </div>
        <div className="modal-form">
          <input 
            type="text" 
            value={currentUserId}
            onChange={(e) => onUserIdChange(e.target.value)}
            placeholder="Enter your user ID" 
          />
          <div className="modal-buttons">
            <button className="btn-modal btn-modal-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-modal btn-modal-primary" onClick={onLoadUserData}>
              Load My Data
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserManage

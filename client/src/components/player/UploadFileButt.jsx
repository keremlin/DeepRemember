import React from 'react'
import Button from '../Button'
import './UploadFileButt.css'

const UploadFileButt = ({ onClick, disabled = false, ...props }) => {
  const handleClick = (e) => {
    if (onClick) {
      onClick(e)
    }
  }

  return (
    <Button
      variant="primary"
      size="medium"
      onClick={handleClick}
      disabled={disabled}
      className="btn-upload-modal"
      title="Upload new files"
      iconName="upload_file"
      iconPosition="left"
      {...props}
    >
      Upload Files
    </Button>
  )
}

export default UploadFileButt


import React, { useState, useRef } from 'react'
import './FileUpload.css'

const FileUpload = ({ onUploadSuccess, onUploadError }) => {
  const [mediaFile, setMediaFile] = useState(null)
  const [subtitleFile, setSubtitleFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [generateSubtitle, setGenerateSubtitle] = useState(false)
  
  const mediaInputRef = useRef(null)
  const subtitleInputRef = useRef(null)

  const handleMediaFileChange = (e) => {
    const file = e.target.files[0]
    setMediaFile(file)
    
    // Auto-check generate subtitle for audio files
    if (file && file.type.startsWith('audio/')) {
      setGenerateSubtitle(true)
    } else {
      setGenerateSubtitle(false)
    }
  }

  const handleSubtitleFileChange = (e) => {
    const file = e.target.files[0]
    setSubtitleFile(file)
    
    // If subtitle file is provided, uncheck generate subtitle
    if (file) {
      setGenerateSubtitle(false)
    }
  }

  const handleGenerateSubtitleChange = (e) => {
    setGenerateSubtitle(e.target.checked)
    
    // If generate subtitle is checked, clear subtitle file
    if (e.target.checked) {
      setSubtitleFile(null)
      if (subtitleInputRef.current) {
        subtitleInputRef.current.value = ''
      }
    }
  }

  const handleUpload = async () => {
    if (!mediaFile) {
      onUploadError?.('Please select a media file first.')
      return
    }

    // Validate subtitle generation option
    if (generateSubtitle && !mediaFile.type.startsWith('audio/')) {
      onUploadError?.('Subtitle generation is only available for audio files.')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('mediaFile', mediaFile)
      
      if (subtitleFile) {
        // Rename subtitle file to match media file name
        const mediaBaseName = mediaFile.name.substring(0, mediaFile.name.lastIndexOf('.'))
        const subtitleExtension = subtitleFile.name.substring(subtitleFile.name.lastIndexOf('.'))
        const renamedSubtitleFile = new File([subtitleFile], mediaBaseName + subtitleExtension, {
          type: subtitleFile.type
        })
        formData.append('subtitleFile', renamedSubtitleFile)
      } else if (generateSubtitle) {
        formData.append('generateSubtitle', 'true')
      }

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch('http://localhost:4004/upload-files', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const result = await response.json()

      if (result.success) {
        onUploadSuccess?.(result.files)
        
        // Reset form
        setMediaFile(null)
        setSubtitleFile(null)
        setGenerateSubtitle(false)
        if (mediaInputRef.current) mediaInputRef.current.value = ''
        if (subtitleInputRef.current) subtitleInputRef.current.value = ''
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      onUploadError?.(`Upload failed: ${error.message}`)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const clearFiles = () => {
    setMediaFile(null)
    setSubtitleFile(null)
    setGenerateSubtitle(false)
    if (mediaInputRef.current) mediaInputRef.current.value = ''
    if (subtitleInputRef.current) subtitleInputRef.current.value = ''
  }

  return (
    <div className="file-upload">
      <div className="upload-header">
        <h3>📁 Upload Media Files</h3>
        <p>Upload audio/video files with optional subtitles or generate subtitles automatically</p>
      </div>

      <div className="upload-form">
        <div className="file-input-group">
          <label htmlFor="mediaFile" className="file-label">
            📁 Media File (Audio/Video)
          </label>
          <input
            ref={mediaInputRef}
            type="file"
            id="mediaFile"
            accept="audio/*,video/*"
            onChange={handleMediaFileChange}
            disabled={isUploading}
            className="file-input"
          />
          {mediaFile && (
            <div className="file-info">
              <span className="file-name">{mediaFile.name}</span>
              <span className="file-size">({(mediaFile.size / 1024 / 1024).toFixed(2)} MB)</span>
            </div>
          )}
        </div>

        <div className="file-input-group">
          <label htmlFor="subtitleFile" className="file-label">
            📝 Subtitle File (SRT/VTT/TXT) - Optional
          </label>
          <input
            ref={subtitleInputRef}
            type="file"
            id="subtitleFile"
            accept=".srt,.vtt,.txt"
            onChange={handleSubtitleFileChange}
            disabled={isUploading || generateSubtitle}
            className="file-input"
          />
          {subtitleFile && (
            <div className="file-info">
              <span className="file-name">{subtitleFile.name}</span>
              <span className="file-size">({(subtitleFile.size / 1024).toFixed(2)} KB)</span>
            </div>
          )}
        </div>

        {mediaFile && mediaFile.type.startsWith('audio/') && (
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={generateSubtitle}
                onChange={handleGenerateSubtitleChange}
                disabled={isUploading || !!subtitleFile}
                className="checkbox-input"
              />
              <span className="checkbox-text">
                🤖 Generate subtitles automatically using AI (Whisper)
              </span>
            </label>
            <p className="checkbox-description">
              This will create an SRT subtitle file automatically from your audio
            </p>
          </div>
        )}

        {isUploading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <span className="progress-text">
              {generateSubtitle ? 'Uploading and generating subtitles...' : 'Uploading...'}
            </span>
          </div>
        )}

        <div className="upload-actions">
          <button
            onClick={clearFiles}
            disabled={isUploading || (!mediaFile && !subtitleFile)}
            className="btn-clear"
          >
            🗑️ Clear
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading || !mediaFile}
            className="btn-upload"
          >
            {isUploading ? '⏳ Uploading...' : '🚀 Upload Files'}
          </button>
        </div>
      </div>

      <div className="upload-info">
        <h4>📋 Supported Formats:</h4>
        <ul>
          <li><strong>Media:</strong> MP3, MP4, WAV, AVI, MOV, M4A, etc.</li>
          <li><strong>Subtitles:</strong> SRT, VTT, TXT</li>
        </ul>
        <h4>💡 Tips:</h4>
        <ul>
          <li>For audio files, you can generate subtitles automatically</li>
          <li>Subtitle files will be renamed to match your media file</li>
          <li>AI subtitle generation may take a few minutes</li>
        </ul>
      </div>
    </div>
  )
}

export default FileUpload

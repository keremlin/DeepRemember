import React, { useState, useRef, useEffect } from 'react'
import Button from '../Button'
import './VoiceChatInput.css'

const VoiceChatInput = ({ onSend, disabled = false }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animationFrameRef = useRef(null)

  useEffect(() => {
    return () => {
      stopRecording()
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Set up audio context for visualization
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (onSend && audioBlob.size > 0) {
          onSend(audioBlob)
        }
        audioChunksRef.current = []
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Start visualizing audio levels
      visualizeAudio()

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Could not access microphone. Please check your permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      setAudioLevel(0)
    }
  }

  const visualizeAudio = () => {
    if (!analyserRef.current || !mediaRecorderRef.current) return

    const analyser = analyserRef.current
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    
    const updateLevel = () => {
      if (!mediaRecorderRef.current || !analyserRef.current) {
        setAudioLevel(0)
        return
      }
      
      analyser.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
      setAudioLevel(average / 255)
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        animationFrameRef.current = requestAnimationFrame(updateLevel)
      } else {
        setAudioLevel(0)
      }
    }
    
    updateLevel()
  }

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="voice-chat-input-container">
      <div className="voice-chat-controls">
        <div className="recording-status">
          {isRecording && (
            <>
              <div className="recording-indicator">
                <span className="recording-dot"></span>
                <span className="recording-text">Recording</span>
              </div>
              <div className="recording-time">{formatTime(recordingTime)}</div>
            </>
          )}
        </div>

        <button
          className={`voice-record-button ${isRecording ? 'recording' : ''}`}
          onClick={handleToggleRecording}
          disabled={disabled}
          title={isRecording ? 'Stop recording' : 'Start recording'}
        >
          <span className="material-symbols-outlined">
            {isRecording ? 'stop' : 'mic'}
          </span>
          {isRecording && (
            <div 
              className="audio-level-indicator"
              style={{ transform: `scale(${1 + audioLevel * 0.5})` }}
            />
          )}
        </button>

        {isRecording && (
          <div className="audio-visualizer">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="visualizer-bar"
                style={{
                  height: `${20 + (audioLevel * 60)}%`,
                  animationDelay: `${i * 0.05}s`
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default VoiceChatInput


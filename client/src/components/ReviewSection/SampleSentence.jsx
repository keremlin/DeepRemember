import React, { useState, useEffect } from 'react'
import SampleSentenceCircle from './SampleSentenceCircle'
import { useAuth } from '../security/AuthContext'
import './SampleSentence.css'

const SampleSentence = ({ 
  sentence, 
  index,
  word,
  showAnswer
}) => {
  const { getAuthHeaders } = useAuth()
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [audio, setAudio] = useState(null)
  const [pressedKey, setPressedKey] = useState(null)
  const [isCreatingAudio, setIsCreatingAudio] = useState(false)

  // Generate hash for the sentence
  const generateHash = (text) => {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }

  // Get audio URL for the sentence
  const getAudioUrl = async () => {
    if (!sentence || !word) return null
    
    try {
      const encodedSentence = encodeURIComponent(sentence.trim())
      
      console.log('Fetching audio URL for:', { word, sentence })
      
      const response = await fetch(`http://localhost:4004/deepRemember/get-audio/${word.trim()}/${encodedSentence}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        mode: 'cors'
      })
      
      const data = await response.json()
      console.log('get-audio response:', data)
      
      if (data.success && data.exists) {
        // Convert relative URL to absolute URL
        const baseUrl = 'http://localhost:4004'
        const fullUrl = `${baseUrl}${data.audioUrl}`
        console.log('Found existing audio:', fullUrl)
        return fullUrl
      } else {
        // Audio doesn't exist, create it
        console.log('Audio not found, creating new audio...')
        return await createAudio()
      }
    } catch (error) {
      console.error('Error getting audio URL:', error)
      return null
    }
  }

  // Create audio for the sentence
  const createAudio = async () => {
    if (!sentence || !word) return null
    
    setIsCreatingAudio(true)
    
    try {
      console.log('Creating audio for:', { text: sentence.trim(), word: word.trim() })
      
      const response = await fetch('http://localhost:4004/deepRemember/convert-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        mode: 'cors',
        body: JSON.stringify({ 
          text: sentence.trim(), 
          word: word.trim() 
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('convert-to-speech response:', data)
      
      if (data.success && data.audioUrl) {
        // Convert relative URL to absolute URL
        const baseUrl = 'http://localhost:4004'
        const fullUrl = `${baseUrl}${data.audioUrl}`
        console.log('Created audio:', fullUrl)
        return fullUrl
      } else {
        console.warn('Audio generation failed or TTS service unavailable')
        return null
      }
    } catch (error) {
      console.error('Error creating audio:', error)
      return null
    } finally {
      setIsCreatingAudio(false)
    }
  }

  // Play audio
  const playAudio = async () => {
    if (!showAnswer || isPlaying || isCreatingAudio) return
    
    try {
      setIsPlaying(true)
      
      // Get audio URL if not already cached
      let urlToPlay = audioUrl
      if (!urlToPlay) {
        const url = await getAudioUrl()
        if (url) {
          console.log('Audio URL:', url)
          setAudioUrl(url)
          urlToPlay = url  // Use the returned URL directly
        } else {
          console.warn('Failed to get audio URL')
          setIsPlaying(false)
          return
        }
      }
      
      console.log('Attempting to play audio from:', urlToPlay)
      
      // Create and play audio
      const audioElement = new Audio(urlToPlay)
      setAudio(audioElement)
      
      audioElement.onended = () => {
        setIsPlaying(false)
        setAudio(null)
      }
      
      audioElement.onerror = (e) => {
        console.error('Audio playback error:', e)
        console.error('Audio element src:', audioElement.src)
        setIsPlaying(false)
        setAudio(null)
      }
      
      await audioElement.play()
    } catch (error) {
      console.error('Error playing audio:', error)
      setIsPlaying(false)
      setAudio(null)
    }
  }

  // Stop audio
  const stopAudio = () => {
    if (audio) {
      audio.pause()
      audio.currentTime = 0
      setIsPlaying(false)
      setAudio(null)
    }
  }

  // Listen for custom keyboard events from parent
  useEffect(() => {
    const handlePlaySentenceAudio = (event) => {
      const { sentenceIndex, word: eventWord, sentence: eventSentence } = event.detail
      
      // Check if this is the correct sentence
      if (sentenceIndex === index && word === eventWord && sentence.trim() === eventSentence) {
        playAudio()
      }
    }

    document.addEventListener('playSentenceAudio', handlePlaySentenceAudio)
    
    return () => {
      document.removeEventListener('playSentenceAudio', handlePlaySentenceAudio)
    }
  }, [index, word, sentence, playAudio])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
    }
  }, [audio])

  return (
    <div className="context-line">
      <div className="sentence-content">
        <span className="sentence-text">{sentence.trim()}</span>
        {showAnswer && (
          <div className="audio-controls">
            <SampleSentenceCircle
              type="play"
              isPlaying={isPlaying}
              onClick={isPlaying ? stopAudio : playAudio}
              title={
                isCreatingAudio 
                  ? 'Creating audio...' 
                  : isPlaying 
                    ? 'Stop audio' 
                    : `Play audio (Press ${index + 1})`
              }
            />
            <SampleSentenceCircle
              type="number"
              number={index + 1}
              onClick={playAudio}
              title={
                isCreatingAudio 
                  ? 'Creating audio...' 
                  : `Play audio (Press ${index + 1})`
              }
              pressedKey={pressedKey}
              index={index}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default SampleSentence

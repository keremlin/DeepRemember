import React, { useState, useEffect } from 'react'
import SampleSentenceCircle from './SampleSentenceCircle'
import './SampleSentence.css'

const SampleSentence = ({ 
  sentence, 
  index,
  word,
  showAnswer
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [audio, setAudio] = useState(null)
  const [pressedKey, setPressedKey] = useState(null)

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
      console.log('🔍 Fetching audio for:', word.trim(), 'sentence:', sentence.trim())
      console.log('🔗 API URL:', `http://localhost:4004/deepRemember/get-audio/${word.trim()}/${encodedSentence}`)
      
      const response = await fetch(`http://localhost:4004/deepRemember/get-audio/${word.trim()}/${encodedSentence}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors'
      })
      
      console.log('📡 Response status:', response.status)
      const data = await response.json()
      console.log('📦 Response data:', data)
      
      if (data.success && data.exists) {
        // Convert relative URL to absolute URL
        const baseUrl = 'http://localhost:4004'
        const fullUrl = `${baseUrl}${data.audioUrl}`
        console.log('✅ Full audio URL:', fullUrl)
        return fullUrl
      } else {
        console.log('❌ Audio not found or API error:', data)
      }
    } catch (error) {
      console.error('❌ Error getting audio URL:', error)
    }
    return null
  }

  // Play audio
  const playAudio = async () => {
    if (!showAnswer || isPlaying) return
    
    try {
      setIsPlaying(true)
      console.log('🎵 Attempting to play audio for sentence:', sentence.trim())
      
      // Get audio URL if not already cached
      if (!audioUrl) {
        console.log('🔍 Getting audio URL for:', word, sentence.trim())
        const url = await getAudioUrl()
        if (url) {
          console.log('✅ Audio URL found:', url)
          setAudioUrl(url)
        } else {
          console.log('❌ No audio URL found')
          setIsPlaying(false)
          return
        }
      }
      
      // Create and play audio
      console.log('🎶 Creating audio element with URL:', audioUrl)
      const audioElement = new Audio(audioUrl)
      setAudio(audioElement)
      
      audioElement.onended = () => {
        console.log('✅ Audio playback ended')
        setIsPlaying(false)
        setAudio(null)
      }
      
      audioElement.onerror = (e) => {
        console.error('❌ Audio playback error:', e)
        setIsPlaying(false)
        setAudio(null)
      }
      
      audioElement.onloadstart = () => {
        console.log('🔄 Audio loading started')
      }
      
      audioElement.oncanplay = () => {
        console.log('✅ Audio can play')
      }
      
      await audioElement.play()
      console.log('▶️ Audio playback started')
    } catch (error) {
      console.error('❌ Error playing audio:', error)
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
        console.log('🎵 Keyboard shortcut triggered for sentence:', index + 1)
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
              title={isPlaying ? 'Stop audio' : `Play audio (Press ${index + 1})`}
            />
            <SampleSentenceCircle
              type="number"
              number={index + 1}
              onClick={playAudio}
              title={`Play audio (Press ${index + 1})`}
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

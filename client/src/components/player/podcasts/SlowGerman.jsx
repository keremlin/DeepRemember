import React, { useState, useEffect } from 'react'
import './SlowGerman.css'

function SlowGerman({ onTrackSelect }) {
  const [episodes, setEpisodes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchRSSFeed()
  }, [])

  const fetchRSSFeed = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Fetch RSS feed
      const response = await fetch('https://slowgerman.com/feed/podcast/')
      if (!response.ok) {
        throw new Error('Failed to fetch RSS feed')
      }
      
      const xmlText = await response.text()
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
      
      // Parse RSS items
      const items = xmlDoc.querySelectorAll('item')
      const parsedEpisodes = []
      
      items.forEach((item) => {
        const title = item.querySelector('title')?.textContent || ''
        const link = item.querySelector('link')?.textContent || ''
        const pubDate = item.querySelector('pubDate')?.textContent || ''
        const description = item.querySelector('description')?.textContent || ''
        const enclosure = item.querySelector('enclosure')
        const mp3Url = enclosure?.getAttribute('url') || ''
        const duration = item.querySelector('itunes\\:duration, duration')?.textContent || ''
        
        if (mp3Url) {
          // Clean description HTML tags for display
          const tempDiv = document.createElement('div')
          tempDiv.innerHTML = description
          const cleanDescription = tempDiv.textContent || tempDiv.innerText || ''
          
          parsedEpisodes.push({
            title: title.trim(),
            link: link.trim(),
            pubDate: pubDate.trim(),
            description: cleanDescription.substring(0, 300) + (cleanDescription.length > 300 ? '...' : ''),
            fullDescription: cleanDescription,
            mp3Url: mp3Url.trim(),
            duration: duration.trim()
          })
        }
      })
      
      setEpisodes(parsedEpisodes)
    } catch (err) {
      console.error('Error fetching RSS feed:', err)
      setError('Failed to load episodes. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEpisodeClick = (episode) => {
    if (onTrackSelect && episode.mp3Url) {
      // Extract filename from URL
      try {
        const urlPath = new URL(episode.mp3Url).pathname
        const filename = urlPath.split('/').pop() || 'podcast.mp3'
        // Pass the external URL and filename to the parent player
        onTrackSelect(episode.mp3Url, episode.title, filename)
      } catch (error) {
        // If URL parsing fails, use default filename
        onTrackSelect(episode.mp3Url, episode.title, 'podcast.mp3')
      }
    }
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className="slowgerman-container">
      <div className="slowgerman-header">
        <h4>
          <span className="material-symbols-outlined">podcasts</span>
          Slow German Podcast
        </h4>
      </div>
      
      <div className="slowgerman-list">
        {isLoading ? (
          <div className="slowgerman-loading">
            <p>Loading episodes...</p>
          </div>
        ) : error ? (
          <div className="slowgerman-error">
            <p>{error}</p>
            <button onClick={fetchRSSFeed} className="retry-button">
              Retry
            </button>
          </div>
        ) : episodes.length > 0 ? (
          episodes.map((episode, index) => (
            <div
              key={index}
              className="slowgerman-episode"
              onClick={() => handleEpisodeClick(episode)}
            >
              <div className="episode-header">
                <div className="episode-info">
                  <h5 className="episode-title">{episode.title}</h5>
                  <div className="episode-meta">
                    {episode.pubDate && (
                      <span className="episode-date">
                        <span className="material-symbols-outlined">calendar_today</span>
                        {formatDate(episode.pubDate)}
                      </span>
                    )}
                    {episode.duration && (
                      <span className="episode-duration">
                        <span className="material-symbols-outlined">schedule</span>
                        {episode.duration}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {episode.description && (
                <p className="episode-description">{episode.description}</p>
              )}
            </div>
          ))
        ) : (
          <p>No episodes found</p>
        )}
      </div>
    </div>
  )
}

export default SlowGerman


import React, { useState, useEffect } from 'react'
import './SearchComponent.css'

const SearchComponent = ({ onSearch, placeholder = 'Search cards by word...', totalResults = null, isSearching = false, searchQuery = '' }) => {
  const [searchTerm, setSearchTerm] = useState('')

  // Sync internal state with parent searchQuery prop
  useEffect(() => {
    setSearchTerm(searchQuery)
  }, [searchQuery])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (onSearch) {
      onSearch(searchTerm.trim())
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  const handleClear = () => {
    setSearchTerm('')
    if (onSearch) {
      onSearch('')
    }
  }

  return (
    <div className="search-component">
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-wrapper">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            className="search-input"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {searchTerm && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={handleClear}
              title="Clear search"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>
        <button
          type="submit"
          className="search-btn"
          title="Search"
          disabled={isSearching}
        >
          <span className="material-symbols-outlined">search</span>
          <span className="search-btn-text">Search</span>
        </button>
      </form>
      {totalResults !== null && searchTerm && (
        <div className="search-results-count">
          {isSearching ? (
            <span className="search-loading">Searching...</span>
          ) : (
            <span className="search-count-text">
              {totalResults === 0 ? (
                'No results found'
              ) : totalResults === 1 ? (
                '1 result found'
              ) : (
                `${totalResults.toLocaleString()} results found`
              )}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchComponent


/**
 * PlaylistComponent.jsx - React component for playlist management
 * This replaces the vanilla JS playlist functionality
 */

const { useState, useEffect } = React;

const PlaylistComponent = ({ onPlayItem, onDeleteItem }) => {
    const [playlist, setPlaylist] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load playlist data
    const loadPlaylist = async () => {
        setLoading(true);
        try {
            const res = await fetch('/files-list');
            const data = await res.json();
            
            if (data.success && data.playlist) {
                setPlaylist(data.playlist);
            } else {
                setPlaylist([]);
            }
        } catch (err) {
            console.error('Error loading playlist:', err);
            setPlaylist([]);
        } finally {
            setLoading(false);
        }
    };

    // Handle play button click
    const handlePlay = (item) => {
        if (onPlayItem) {
            onPlayItem(item);
        }
    };

    // Handle delete button click
    const handleDelete = async (item) => {
        if (!confirm('Are you sure you want to delete this file and its subtitle?')) return;
        
        try {
            const res = await fetch('/delete-files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ media: item.media, subtitle: item.subtitle })
            });
            const result = await res.json();
            
            if (result.success) {
                // Refresh playlist after successful deletion
                loadPlaylist();
                if (onDeleteItem) {
                    onDeleteItem('Files deleted successfully!');
                }
            } else {
                if (onDeleteItem) {
                    onDeleteItem('Delete failed.');
                }
            }
        } catch (err) {
            if (onDeleteItem) {
                onDeleteItem('Error deleting files: ' + err.message);
            }
        }
    };

    // Load playlist on component mount
    useEffect(() => {
        loadPlaylist();
    }, []);

    if (loading) {
        return (
            <div className="playlist-section" id="playlistSection">
                <div className="playlist-title">Playlist</div>
                <ul className="playlist-list" id="playlistList">
                    <li>Loading...</li>
                </ul>
            </div>
        );
    }

    if (playlist.length === 0) {
        return (
            <div className="playlist-section" id="playlistSection">
                <div className="playlist-title">Playlist</div>
                <ul className="playlist-list" id="playlistList">
                    <li>No files uploaded yet.</li>
                </ul>
            </div>
        );
    }

    return (
        <div className="playlist-section" id="playlistSection">
            <div className="playlist-title">Playlist</div>
            <ul className="playlist-list" id="playlistList">
                {playlist.map((item, idx) => {
                    const audioBase = item.media.replace(/\.[^/.]+$/, '');
                    const truncatedAudioName = audioBase.length > 50 ? audioBase.substring(0, 50) + '...' : audioBase;
                    const audioTitle = audioBase.length > 50 ? audioBase : '';
                    const subtitleIcon = item.subtitle ? '<span class="subtitle-icon" title="subtitle">📝</span>' : '';
                    
                    return (
                        <li key={idx} className="playlist-item">
                            <span className="file-names">
                                <span className="audio-name" title={audioTitle}>
                                    🎵 {truncatedAudioName}
                                    {item.subtitle && <span className="subtitle-icon" title="subtitle">📝</span>}
                                </span>
                            </span>
                            <button 
                                className="btn btn-primary"
                                onClick={() => handlePlay(item)}
                            >
                                ▶ Play
                            </button>
                            <button 
                                className="btn-delete"
                                title="Delete"
                                onClick={() => handleDelete(item)}
                            >
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="9" cy="9" r="8" fill="white" stroke="#e53e3e" strokeWidth="2"/>
                                    <path d="M6 6L12 12" stroke="#e53e3e" strokeWidth="2" strokeLinecap="round"/>
                                    <path d="M12 6L6 12" stroke="#e53e3e" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

// Export for use in other components
window.PlaylistComponent = PlaylistComponent;

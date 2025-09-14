# React Lifecycle to Hooks Migration Guide

This guide demonstrates how to replace React class lifecycle methods with modern hooks patterns, using examples from your subtitle player application.

## 🔄 **Lifecycle Method → Hook Patterns**

### **1. componentDidMount → useEffect(() => {}, [])**

**❌ Old Class Component:**
```javascript
class PlaylistComponent extends React.Component {
    componentDidMount() {
        this.loadPlaylist();
    }
    
    loadPlaylist = async () => {
        // Load data...
    }
}
```

**✅ New Hook Pattern:**
```jsx
const PlaylistComponent = ({ onPlayItem, onDeleteItem }) => {
    const [playlist, setPlaylist] = useState([]);
    const [loading, setLoading] = useState(true);

    // componentDidMount pattern - runs once on mount
    useEffect(() => {
        loadPlaylist();
    }, []); // Empty dependency array = run once on mount

    const loadPlaylist = async () => {
        setLoading(true);
        try {
            const res = await fetch('/files-list');
            const data = await res.json();
            setPlaylist(data.playlist || []);
        } catch (err) {
            console.error('Error loading playlist:', err);
            setPlaylist([]);
        } finally {
            setLoading(false);
        }
    };
};
```

### **2. componentDidUpdate → useEffect(() => {}, [deps])**

**❌ Old Class Component:**
```javascript
class CardReviewComponent extends React.Component {
    componentDidUpdate(prevProps) {
        if (prevProps.currentCardIndex !== this.props.currentCardIndex) {
            this.setState({ showAnswer: false, answerShown: false });
        }
    }
}
```

**✅ New Hook Pattern:**
```jsx
const CardReviewComponent = ({ cards, currentCardIndex, onAnswerCard }) => {
    const [showAnswer, setShowAnswer] = useState(false);
    const [answerShown, setAnswerShown] = useState(false);

    // componentDidUpdate pattern - runs when currentCardIndex changes
    useEffect(() => {
        setShowAnswer(false);
        setAnswerShown(false);
    }, [currentCardIndex]); // Dependency array = run when currentCardIndex changes
};
```

### **3. componentWillUnmount → return cleanup from useEffect**

**❌ Old Class Component:**
```javascript
class SubtitleDisplay extends React.Component {
    componentDidMount() {
        this.timeoutId = setTimeout(() => {
            this.hideTooltip();
        }, 5000);
    }
    
    componentWillUnmount() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
    }
}
```

**✅ New Hook Pattern:**
```jsx
const SubtitleDisplay = ({ subtitles, currentSubtitleIndex }) => {
    const [showTooltip, setShowTooltip] = useState(null);

    // componentWillUnmount pattern - cleanup function
    useEffect(() => {
        if (showTooltip) {
            const timeoutId = setTimeout(() => {
                setShowTooltip(null);
            }, 5000);
            
            // Cleanup function (componentWillUnmount pattern)
            return () => clearTimeout(timeoutId);
        }
    }, [showTooltip]);
};
```

## 🎯 **Advanced Hook Patterns**

### **4. Multiple useEffect for Different Concerns**

**✅ Separation of Concerns:**
```jsx
const CreateCardModal = ({ isOpen, onClose, onCreateCard }) => {
    const [formData, setFormData] = useState({ word: '', translation: '', context: '' });
    const searchTimeoutRef = useRef(null);
    const translationTimeoutRef = useRef(null);

    // Effect 1: Reset form when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setFormData({ word: '', translation: '', context: '' });
        }
    }, [isOpen]);

    // Effect 2: Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            if (translationTimeoutRef.current) {
                clearTimeout(translationTimeoutRef.current);
            }
        };
    }, []);

    // Effect 3: Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Tab' && translationData) {
                event.preventDefault();
                setFormData(prev => ({
                    ...prev,
                    translation: translationData.translation,
                    context: translationData.sampleSentence
                }));
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [translationData]);
};
```

### **5. Custom Hooks for Reusable Logic**

**✅ Extract Reusable Logic:**
```jsx
// Custom hook for API calls
const useApiCall = (url, options = {}) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const execute = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(url, options);
            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [url, options]);

    return { data, loading, error, execute };
};

// Use the custom hook
const PlaylistComponent = () => {
    const { data, loading, error, execute } = useApiCall('/files-list');

    useEffect(() => {
        execute();
    }, [execute]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;
    return <div>{/* Render playlist */}</div>;
};
```

## 📊 **Migration Checklist**

### **✅ What We've Migrated:**

1. **SubtitleDisplay.jsx**:
   - ✅ `componentDidMount` → `useEffect(() => {}, [])`
   - ✅ `componentWillUnmount` → `return cleanup from useEffect`
   - ✅ Manual timeout management → Hook-based cleanup

2. **PlaylistComponent.jsx**:
   - ✅ `componentDidMount` → `useEffect(() => {}, [])`
   - ✅ State management → `useState` hooks
   - ✅ Async data loading → Hook-based effects

3. **CardReviewComponent.jsx**:
   - ✅ `componentDidUpdate` → `useEffect(() => {}, [currentCardIndex])`
   - ✅ Event listeners → Hook-based with cleanup
   - ✅ Keyboard shortcuts → `useEffect` with dependencies

4. **CreateCardModal.jsx**:
   - ✅ `componentDidMount` → `useEffect(() => {}, [])`
   - ✅ `componentWillUnmount` → `return cleanup from useEffect`
   - ✅ Multiple effects for different concerns
   - ✅ Ref management → `useRef` hooks

## 🎯 **Key Benefits of Hooks Migration**

### **Performance Benefits:**
- **Optimized Re-renders**: Only re-run effects when dependencies change
- **Automatic Cleanup**: Prevents memory leaks with cleanup functions
- **Better Tree Shaking**: Smaller bundle sizes

### **Developer Experience:**
- **Simpler Logic**: No need to split logic across multiple lifecycle methods
- **Better Testing**: Hooks can be tested independently
- **Reusable Logic**: Custom hooks for shared functionality

### **Code Quality:**
- **Separation of Concerns**: Each effect handles one specific concern
- **Predictable Behavior**: Clear dependency arrays
- **Easier Debugging**: React DevTools show hook dependencies

## 🚀 **Modern Hook Patterns Used**

| **Pattern** | **Use Case** | **Example** |
|-------------|--------------|-------------|
| `useEffect(() => {}, [])` | Run once on mount | Load initial data |
| `useEffect(() => {}, [dep])` | Run when dependency changes | Reset state on prop change |
| `useEffect(() => () => cleanup)` | Cleanup on unmount | Remove event listeners |
| `useRef()` | Persistent values | Timeout IDs, DOM refs |
| `useCallback()` | Memoized functions | Prevent unnecessary re-renders |
| `useMemo()` | Memoized values | Expensive calculations |

## 🎉 **Result**

Your React components now use modern hooks patterns that are:
- **More Performant**: Optimized re-rendering and cleanup
- **More Maintainable**: Clear separation of concerns
- **More Testable**: Isolated, pure functions
- **More Reusable**: Custom hooks for shared logic

The migration from class lifecycle methods to hooks represents a fundamental shift toward more functional, composable React code!

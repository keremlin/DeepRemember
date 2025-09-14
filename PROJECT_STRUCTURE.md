# 🏗️ **React Project Structure - Organized Codebase**

## 📁 **New Folder Structure**

```
subtitle/
├── src/                          # 🎯 Main React source code
│   ├── components/               # 🧩 Reusable React components
│   │   ├── SubtitleDisplay.jsx   # Subtitle display with word interactions
│   │   ├── PlaylistComponent.jsx # Media playlist management
│   │   ├── CardReviewComponent.jsx # Card review system
│   │   └── CreateCardModal.jsx   # Card creation modal
│   ├── hooks/                   # 🪝 Custom React hooks
│   │   ├── useApi.js            # API call management
│   │   ├── useTooltip.js        # Tooltip state management
│   │   └── useKeyboardShortcuts.js # Keyboard event handling
│   ├── services/                # 🌐 API service layer
│   │   ├── translationService.js # Ollama translation API
│   │   ├── playlistService.js   # Playlist operations
│   │   └── deepRememberService.js # Learning system API
│   ├── styles/                  # 🎨 CSS styles
│   │   └── styles.css           # Main application styles
│   ├── pages/                   # 📄 Top-level pages (future SPA)
│   ├── App.jsx                  # Main React app component
│   └── main.jsx                 # React entry point
├── public/                      # 📂 Static assets
│   └── js/                      # Legacy vanilla JS files
├── views/                       # 🖼️ HTML templates
├── routes/                      # 🛣️ Server routes
└── config/                     # ⚙️ Configuration files
```

## 🎯 **Key Improvements**

### **1. Separation of Concerns**
- **Components**: Pure UI components with minimal logic
- **Hooks**: Reusable stateful logic
- **Services**: API communication layer
- **Styles**: Centralized styling

### **2. Custom Hooks Created**

#### **`useApi.js`** - API Management
```jsx
const { data, loading, error, execute } = useApi();
// Handles loading states, error handling, and API calls
```

#### **`useTooltip.js`** - Tooltip Management
```jsx
const { showTooltip, tooltipContent, showTooltipFor } = useTooltip();
// Manages tooltip state with auto-hide timers
```

#### **`useKeyboardShortcuts.js`** - Keyboard Events
```jsx
useKeyboardShortcuts([
  { key: 'enter', handler: () => handleSubmit() },
  { key: 'escape', handler: () => handleCancel() }
]);
// Clean keyboard event management with cleanup
```

### **3. Service Layer**

#### **`translationService.js`** - Translation API
```jsx
// Simple word translation
const result = await translationService.translateWord('hello');

// Detailed translation with samples
const detailed = await translationService.getDetailedTranslation('hello');
```

#### **`playlistService.js`** - Playlist Operations
```jsx
// Load playlist
const playlist = await playlistService.loadPlaylist();

// Delete files
const result = await playlistService.deleteFiles(media, subtitle);
```

#### **`deepRememberService.js`** - Learning System
```jsx
// Create card
const card = await deepRememberService.createCard(userId, cardData);

// Answer card
const result = await deepRememberService.answerCard(userId, cardId, rating);
```

## 🔄 **Migration Benefits**

### **Before (Vanilla JS)**
```javascript
// Scattered API calls
const response = await fetch('/api/translate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ word })
});

// Manual state management
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

// Duplicate code across components
```

### **After (Organized React)**
```jsx
// Clean service calls
const result = await translationService.translateWord(word);

// Reusable hooks
const { data, loading, error } = useApi();

// Consistent patterns across components
```

## 🚀 **Usage Examples**

### **Component with Services**
```jsx
import React from 'react';
import { useApi } from '../hooks/useApi';
import { playlistService } from '../services/playlistService';

const PlaylistComponent = () => {
  const { data, loading, execute } = useApi([]);
  
  useEffect(() => {
    execute('/files-list');
  }, [execute]);
  
  const handleDelete = async (item) => {
    await playlistService.deleteFiles(item.media, item.subtitle);
    execute('/files-list'); // Refresh
  };
  
  return (
    <div>
      {loading ? 'Loading...' : data.map(item => (
        <div key={item.id}>
          {item.name}
          <button onClick={() => handleDelete(item)}>Delete</button>
        </div>
      ))}
    </div>
  );
};
```

### **Custom Hook Usage**
```jsx
import { useTooltip } from '../hooks/useTooltip';

const WordComponent = ({ word }) => {
  const { showTooltip, tooltipContent, showTooltipFor } = useTooltip();
  
  const handleClick = async () => {
    showTooltipFor(word, 'Loading...');
    const translation = await getTranslation(word);
    showTooltipFor(word, translation);
  };
  
  return (
    <span onClick={handleClick}>
      {word}
      {showTooltip === word && (
        <div className="tooltip">{tooltipContent}</div>
      )}
    </span>
  );
};
```

## 🌐 **Server Integration**

### **Updated Routes**
```javascript
// Serve src files
router.get('/src/*', (req, res) => {
  const filePath = path.join(__dirname, '..', req.path);
  res.sendFile(filePath);
});
```

### **HTML Integration**
```html
<!-- Updated HTML references -->
<link rel="stylesheet" href="/src/styles/styles.css">
<script type="text/babel" src="/src/components/SubtitleDisplay.jsx"></script>
```

## 📊 **File Organization Summary**

| **Category** | **Files** | **Purpose** |
|--------------|-----------|--------------|
| **Components** | 4 files | UI components with minimal logic |
| **Hooks** | 3 files | Reusable stateful logic |
| **Services** | 3 files | API communication layer |
| **Styles** | 1 file | Centralized CSS |
| **Entry Points** | 2 files | React app initialization |

## 🎉 **Benefits Achieved**

### **✅ Code Organization**
- Clear separation of concerns
- Reusable components and hooks
- Centralized API management

### **✅ Maintainability**
- Consistent patterns across components
- Easy to find and modify code
- Reduced code duplication

### **✅ Scalability**
- Easy to add new components
- Reusable hooks for common patterns
- Service layer for API management

### **✅ Developer Experience**
- Modern React patterns
- Clean imports and exports
- Better debugging and testing

## 🚀 **Next Steps**

1. **Test the new structure**: Visit `http://localhost:7000/hybrid`
2. **Add more components**: Create new components in `src/components/`
3. **Extend hooks**: Add more custom hooks in `src/hooks/`
4. **Enhance services**: Add more API services in `src/services/`
5. **Convert to SPA**: Move to `src/pages/` for full React app

The codebase is now properly organized following React best practices! 🎯

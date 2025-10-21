# STT (Speech-to-Text) Service Documentation

This document provides comprehensive information about the STT service implementations in the DeepRemember project.

## Overview

The STT service provides speech-to-text conversion capabilities for generating subtitles from audio files. The system uses a factory pattern to support multiple STT providers and is designed to be easily extensible.

## Architecture

### Core Components

- **`IStt.js`** - Interface defining the contract for all STT implementations
- **`SstFactory.js`** - Factory class for creating STT service instances
- **`localWhisper.js`** - Local Whisper implementation using OpenAI's Whisper CLI
- **`Groq.js`** - Groq API implementation using Groq's Whisper service
- **`../tools/ConvertJsonToSrt.js`** - Utility for converting transcription data to SRT format

### Factory Pattern

The STT services use a factory pattern for easy configuration and instantiation:

```javascript
const SstFactory = require('./stt/SstFactory');

// Create service using configured type
const sstService = SstFactory.createSstService();

// Create specific service type
const groqService = SstFactory.createSstServiceByType('groq', {
  model: 'whisper-large-v3-turbo'
});
```

## Available STT Services

### 1. LocalWhisper

**Description**: Uses OpenAI's Whisper command-line tool for local speech-to-text conversion.

**Configuration**:
```bash
WHISPER_TYPE=LocalWhisper
WHISPER_MODEL=base  # tiny, base, small, medium, large, large-v2, large-v3
```

**Features**:
- Runs locally (no API calls)
- Supports multiple Whisper model sizes
- Configurable language detection
- Works offline

**Supported Models**:
- `tiny` - Fastest, least accurate
- `base` - Default, good balance
- `small` - Better accuracy
- `medium` - High accuracy
- `large` - Very high accuracy
- `large-v2` - Latest large model
- `large-v3` - Most accurate, slowest

**Usage**:
```javascript
const localWhisper = new LocalWhisper({
  model: 'large-v3',
  language: 'en'
});
```

### 2. Groq

**Description**: Uses Groq's Whisper API for cloud-based speech-to-text conversion.

**Configuration**:
```bash
WHISPER_TYPE=Groq
WHISPER_MODEL=whisper-large-v3-turbo
GROQ_API_KEY=your_groq_api_key
```

**Features**:
- Cloud-based processing
- Fast API responses
- Multiple model options
- Verbose JSON output with timestamps

**Usage**:
```javascript
const groqService = new GroqStt({
  model: 'whisper-large-v3-turbo',
  temperature: 0,
  responseFormat: 'verbose_json'
});
```

## Configuration


### Configuration File

The configuration is managed in `backend/config/app.js`:

```javascript
module.exports = {
  // STT Service settings
  WHISPER_TYPE: process.env.WHISPER_TYPE || 'LocalWhisper',
  WHISPER_MODEL: process.env.WHISPER_MODEL || 'whisper-large-v3-turbo',
  WHISPER_OUTPUT_FORMAT: 'srt',
  // ... other settings
};
```

## Usage Examples

### Basic Usage

```javascript
const SstFactory = require('./stt/SstFactory');

async function convertAudioToSubtitles(audioPath, outputPath) {
  try {
    const sstService = SstFactory.createSstService();
    const result = await sstService.convert(audioPath, outputPath);
    
    if (result.success) {
      console.log('Subtitle generated successfully');
      return result;
    }
  } catch (error) {
    console.error('STT conversion failed:', error);
  }
}


## Supported Audio Formats

Both STT services support the following audio formats:

- **Audio**: `.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg`, `.wma`, `.aac`
- **Video**: `.mp4`, `.avi`, `.mov`

## Output Format

All STT services output SRT (SubRip Subtitle) format files with the following structure:

```
1
00:00:00,000 --> 00:00:05,000
First subtitle line

2
00:00:05,000 --> 00:00:10,000
Second subtitle line
```

For more information about the DeepRemember project, see the main [README.md](../README.md).

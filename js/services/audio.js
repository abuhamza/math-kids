// Audio Service - Handles sound effects and audio feedback
export class AudioService {
  constructor() {
    this.audioContext = null;
    this.sounds = {};
    this.isEnabled = true;
    this.volume = 0.5;
    this.isMuted = false;
    this.supportedFormats = [];
    this.loadingPromises = new Map();
  }

  init() {
    try {
      // Check browser audio capabilities
      this.checkAudioSupport();
      
      // Create audio context for Web Audio API (optional enhancement)
      if (window.AudioContext || window.webkitAudioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Preload essential sounds
      this.preloadSounds();
      
      console.log('Audio service initialized');
      console.log('Supported formats:', this.supportedFormats);
    } catch (error) {
      console.warn('Audio initialization failed:', error);
      this.isEnabled = false;
    }
  }

  checkAudioSupport() {
    const audio = document.createElement('audio');
    this.supportedFormats = [];
    
    // Check supported audio formats
    if (audio.canPlayType) {
      if (audio.canPlayType('audio/mpeg')) {
        this.supportedFormats.push('mp3');
      }
      if (audio.canPlayType('audio/wav')) {
        this.supportedFormats.push('wav');
      }
      if (audio.canPlayType('audio/ogg')) {
        this.supportedFormats.push('ogg');
      }
    }
    
    // Fallback to basic support if no format detection
    if (this.supportedFormats.length === 0) {
      this.supportedFormats = ['mp3', 'wav'];
    }
  }

  async preloadSounds() {
    const soundFiles = {
      success: this.createSoundUrls('success'),
      error: this.createSoundUrls('error'),
      celebration: this.createSoundUrls('celebration'),
      click: this.createSoundUrls('click'),
      badge: this.createSoundUrls('badge'),
      tick: this.createSoundUrls('tick')
    };

    // Load sounds
    for (const [soundName, urls] of Object.entries(soundFiles)) {
      this.loadingPromises.set(soundName, this.loadSound(soundName, urls));
    }

    // Wait for critical sounds to load
    try {
      await Promise.allSettled([
        this.loadingPromises.get('success'),
        this.loadingPromises.get('error'),
        this.loadingPromises.get('click')
      ]);
      console.log('Critical sounds loaded');
    } catch (error) {
      console.warn('Failed to load some sounds:', error);
    }
  }

  createSoundUrls(soundName) {
    return this.supportedFormats.map(format => 
      `./assets/sounds/${soundName}.${format}`
    );
  }

  async loadSound(soundName, urls) {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = this.volume;
    
    // Try each URL until one works
    for (const url of urls) {
      try {
        audio.src = url;
        await new Promise((resolve, reject) => {
          audio.addEventListener('canplaythrough', resolve, { once: true });
          audio.addEventListener('error', reject, { once: true });
          audio.load();
        });
        
        this.sounds[soundName] = audio;
        console.log(`Loaded sound: ${soundName}`);
        return audio;
      } catch (error) {
        console.warn(`Failed to load ${url}:`, error);
        continue;
      }
    }
    
    // If all URLs fail, create a silent audio element
    console.warn(`Could not load any version of sound: ${soundName}`);
    this.sounds[soundName] = audio; // Keep the element for consistent API
    return audio;
  }

  playSound(soundName, volume = null) {
    if (!this.isEnabled || this.isMuted) {
      return;
    }

    const audio = this.sounds[soundName];
    if (!audio) {
      // If sound is still loading, try to play when ready
      if (this.loadingPromises.has(soundName)) {
        this.loadingPromises.get(soundName).then(() => {
          this.playSound(soundName, volume);
        }).catch(() => {
          // Ignore loading errors
        });
      }
      return;
    }

    try {
      // Reset playback position
      audio.currentTime = 0;
      
      // Set volume
      if (volume !== null) {
        audio.volume = Math.max(0, Math.min(1, volume));
      } else {
        audio.volume = this.volume;
      }
      
      // Play the sound
      const playPromise = audio.play();
      
      // Handle play promise (required for some browsers)
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Ignore autoplay policy errors
          if (error.name !== 'NotAllowedError') {
            console.warn(`Failed to play ${soundName}:`, error);
          }
        });
      }
    } catch (error) {
      console.warn(`Error playing ${soundName}:`, error);
    }
  }

  // Convenience methods for different types of feedback
  playCorrect() {
    this.playSound('success');
  }

  playIncorrect() {
    this.playSound('error');
  }

  playClick() {
    this.playSound('click', 0.3); // Quieter for UI interactions
  }

  playCelebration() {
    this.playSound('celebration');
  }

  playBadgeUnlocked() {
    this.playSound('badge');
  }

  playTick() {
    this.playSound('tick', 0.2); // Very quiet for timer ticks
  }

  // Main feedback method used by game
  playFeedback(isCorrect) {
    if (isCorrect) {
      this.playCorrect();
    } else {
      this.playIncorrect();
    }
  }

  // Volume control
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    
    // Update volume for all loaded sounds
    Object.values(this.sounds).forEach(audio => {
      if (audio) {
        audio.volume = this.volume;
      }
    });
    
    console.log(`Audio volume set to ${this.volume}`);
  }

  getVolume() {
    return this.volume;
  }

  // Mute control
  setMuted(muted) {
    this.isMuted = muted;
    console.log(`Audio ${muted ? 'muted' : 'unmuted'}`);
  }

  isMutedState() {
    return this.isMuted;
  }

  toggleMute() {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  // Enable/disable audio
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`Audio ${enabled ? 'enabled' : 'disabled'}`);
  }

  isEnabledState() {
    return this.isEnabled;
  }

  // Create audio for text-to-speech (accessibility feature)
  async speakText(text, options = {}) {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }

    if (!this.isEnabled || this.isMuted) {
      return;
    }

    try {
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure speech options
      utterance.rate = options.rate || 0.9;
      utterance.pitch = options.pitch || 1.1;
      utterance.volume = options.volume || this.volume;
      
      // Use child-friendly voice if available
      const voices = speechSynthesis.getVoices();
      const childVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('child') ||
        voice.name.toLowerCase().includes('kid')
      );
      
      if (childVoice) {
        utterance.voice = childVoice;
      } else {
        // Prefer female voices for children's apps
        const femaleVoice = voices.find(voice => 
          voice.name.toLowerCase().includes('female') ||
          voice.name.toLowerCase().includes('woman')
        );
        if (femaleVoice) {
          utterance.voice = femaleVoice;
        }
      }
      
      // Speak the text
      speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.warn('Text-to-speech failed:', error);
    }
  }

  // Announce important information for screen readers
  announceText(text) {
    // Use ARIA live regions
    const announcer = document.getElementById('aria-announcements');
    if (announcer) {
      announcer.textContent = text;
    }
    
    // Also use speech synthesis if enabled
    if (this.isEnabled && !this.isMuted) {
      this.speakText(text);
    }
  }

  // Audio cues for accessibility
  playAccessibilityCue(type) {
    switch (type) {
      case 'focus':
        this.playTick();
        break;
      case 'error':
        this.playIncorrect();
        break;
      case 'success':
        this.playCorrect();
        break;
      case 'navigation':
        this.playClick();
        break;
      default:
        this.playClick();
    }
  }

  // Create audio feedback for number reading (educational feature)
  async speakNumber(number, operation = null) {
    if (!this.isEnabled || this.isMuted) {
      return;
    }

    let text = number.toString();
    
    // Add context for operations
    if (operation) {
      const operationText = {
        'addition': 'plus',
        'subtraction': 'minus',
        'multiplication': 'times',
        'division': 'divided by'
      };
      
      if (operationText[operation]) {
        text = `${text} ${operationText[operation]}`;
      }
    }
    
    await this.speakText(text, { rate: 0.8, pitch: 1.2 });
  }

  // Create audio feedback for math equations
  async speakEquation(operand1, operation, operand2) {
    if (!this.isEnabled || this.isMuted) {
      return;
    }

    const operationText = {
      'addition': 'plus',
      'subtraction': 'minus',
      'multiplication': 'times',
      'division': 'divided by'
    };
    
    const text = `${operand1} ${operationText[operation] || operation} ${operand2} equals?`;
    await this.speakText(text, { rate: 0.8 });
  }

  // Cleanup
  destroy() {
    // Stop all audio
    Object.values(this.sounds).forEach(audio => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    });
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    // Cancel any ongoing speech
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    
    this.sounds = {};
    console.log('Audio service destroyed');
  }

  // Get audio service status
  getStatus() {
    return {
      enabled: this.isEnabled,
      muted: this.isMuted,
      volume: this.volume,
      supportedFormats: this.supportedFormats,
      loadedSounds: Object.keys(this.sounds),
      hasAudioContext: !!this.audioContext,
      hasSpeechSynthesis: 'speechSynthesis' in window
    };
  }
} 
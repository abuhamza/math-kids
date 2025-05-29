// Internationalization Service
export class I18nService {
  constructor() {
    this.currentLanguage = 'en';
    this.translations = {};
    this.fallbackLanguage = 'en';
    this.supportedLanguages = ['en', 'fr', 'de'];
  }

  async init() {
    // Detect user's preferred language
    const detectedLanguage = this.detectLanguage();
    await this.setLanguage(detectedLanguage);
  }

  detectLanguage() {
    // Check URL parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (urlLang && this.supportedLanguages.includes(urlLang)) {
      return urlLang;
    }

    // Check localStorage
    const savedLang = localStorage.getItem('mathkids_language');
    if (savedLang && this.supportedLanguages.includes(savedLang)) {
      return savedLang;
    }

    // Check browser language
    const browserLang = navigator.language.split('-')[0];
    if (this.supportedLanguages.includes(browserLang)) {
      return browserLang;
    }

    // Default to English
    return this.fallbackLanguage;
  }

  async setLanguage(language) {
    if (!this.supportedLanguages.includes(language)) {
      console.warn(`Language ${language} not supported, falling back to ${this.fallbackLanguage}`);
      language = this.fallbackLanguage;
    }

    this.currentLanguage = language;
    
    // Load translation file if not already loaded
    if (!this.translations[language]) {
      try {
        await this.loadTranslations(language);
      } catch (error) {
        console.error(`Failed to load translations for ${language}:`, error);
        // Fallback to English if current language fails
        if (language !== this.fallbackLanguage) {
          return this.setLanguage(this.fallbackLanguage);
        }
        throw error;
      }
    }

    // Save language preference
    localStorage.setItem('mathkids_language', language);
    
    // Update document language
    document.documentElement.lang = language;
    
    // Dispatch language change event
    document.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { language, translations: this.translations[language] }
    }));
  }

  async loadTranslations(language) {
    try {
      const response = await fetch(`./locales/${language}.json`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const translations = await response.json();
      this.translations[language] = translations;
      
      console.log(`Loaded translations for ${language}`);
    } catch (error) {
      console.error(`Failed to load translations for ${language}:`, error);
      throw error;
    }
  }

  // Get translated string with optional interpolation
  t(key, params = {}) {
    const translation = this.getTranslation(key);
    return this.interpolate(translation, params);
  }

  getTranslation(key) {
    const keys = key.split('.');
    const currentTranslations = this.translations[this.currentLanguage] || {};
    const fallbackTranslations = this.translations[this.fallbackLanguage] || {};
    
    // Try current language first
    let translation = this.getNestedValue(currentTranslations, keys);
    
    // Fallback to English if not found
    if (translation === undefined && this.currentLanguage !== this.fallbackLanguage) {
      translation = this.getNestedValue(fallbackTranslations, keys);
    }
    
    // Return key if translation not found
    if (translation === undefined) {
      console.warn(`Translation not found for key: ${key}`);
      return key;
    }
    
    return translation;
  }

  getNestedValue(obj, keys) {
    return keys.reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  interpolate(text, params) {
    if (typeof text !== 'string' || Object.keys(params).length === 0) {
      return text;
    }

    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  // Get current language
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  // Get supported languages
  getSupportedLanguages() {
    return this.supportedLanguages.map(lang => ({
      code: lang,
      name: this.getLanguageName(lang),
      nativeName: this.getLanguageNativeName(lang)
    }));
  }

  getLanguageName(code) {
    const names = {
      'en': 'English',
      'fr': 'French',
      'de': 'German'
    };
    return names[code] || code;
  }

  getLanguageNativeName(code) {
    const nativeNames = {
      'en': 'English',
      'fr': 'Français',
      'de': 'Deutsch'
    };
    return nativeNames[code] || code;
  }

  // Get operation symbol for current language
  getOperationSymbol(operation) {
    return this.t(`operations.${operation}.symbol`);
  }

  // Format numbers according to locale
  formatNumber(number) {
    const locales = {
      'en': 'en-US',
      'fr': 'fr-FR',
      'de': 'de-DE'
    };
    
    const locale = locales[this.currentLanguage] || locales['en'];
    return new Intl.NumberFormat(locale).format(number);
  }

  // Format time duration
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours} ${this.t('time.hours')} ${minutes} ${this.t('time.minutes')}`;
    } else if (minutes > 0) {
      return `${minutes} ${this.t('time.minutes')} ${remainingSeconds} ${this.t('time.seconds')}`;
    } else {
      return `${remainingSeconds} ${this.t('time.seconds')}`;
    }
  }

  // Get percentage format
  formatPercentage(value) {
    const locales = {
      'en': 'en-US',
      'fr': 'fr-FR',
      'de': 'de-DE'
    };
    
    const locale = locales[this.currentLanguage] || locales['en'];
    return new Intl.NumberFormat(locale, { 
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(value / 100);
  }
} 
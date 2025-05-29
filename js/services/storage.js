// Storage Service - Handles local storage operations
export class StorageService {
  constructor() {
    this.storageKeys = {
      progress: 'mathkids_progress',
      settings: 'mathkids_settings',
      sessions: 'mathkids_sessions'
    };
    this.storageVersion = '1.0';
    this.maxStorageSize = 5 * 1024 * 1024; // 5MB limit
  }

  async init() {
    try {
      // Check storage availability
      if (!this.isStorageAvailable()) {
        console.warn('Local storage not available, data will not persist');
        return false;
      }

      // Check and migrate data if needed
      await this.migrateDataIfNeeded();
      
      // Clean up old data if storage is getting full
      await this.cleanupIfNeeded();
      
      console.log('Storage service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      return false;
    }
  }

  isStorageAvailable() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Settings management
  async saveSettings(settings) {
    try {
      const settingsData = {
        version: this.storageVersion,
        data: settings,
        updated: Date.now()
      };
      
      localStorage.setItem(this.storageKeys.settings, JSON.stringify(settingsData));
      console.log('Settings saved successfully');
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  async getSettings() {
    try {
      const stored = localStorage.getItem(this.storageKeys.settings);
      if (!stored) return null;

      const settingsData = JSON.parse(stored);
      return settingsData.data || null;
    } catch (error) {
      console.error('Failed to load settings:', error);
      return null;
    }
  }

  // Progress management
  async saveProgress(progress) {
    try {
      const progressData = {
        version: this.storageVersion,
        data: progress,
        updated: Date.now()
      };
      
      localStorage.setItem(this.storageKeys.progress, JSON.stringify(progressData));
      console.log('Progress saved successfully');
      return true;
    } catch (error) {
      console.error('Failed to save progress:', error);
      
      // If storage is full, try to clean up and retry
      if (error.name === 'QuotaExceededError') {
        await this.cleanupOldSessions();
        try {
          localStorage.setItem(this.storageKeys.progress, JSON.stringify(progressData));
          console.log('Progress saved after cleanup');
          return true;
        } catch (retryError) {
          console.error('Failed to save progress even after cleanup:', retryError);
        }
      }
      
      return false;
    }
  }

  async getProgress() {
    try {
      const stored = localStorage.getItem(this.storageKeys.progress);
      if (!stored) return null;

      const progressData = JSON.parse(stored);
      return progressData.data || null;
    } catch (error) {
      console.error('Failed to load progress:', error);
      return null;
    }
  }

  // Session management
  async saveSession(sessionData) {
    try {
      const sessions = await this.getSessions() || [];
      
      const newSession = {
        id: this.generateSessionId(),
        timestamp: Date.now(),
        ...sessionData
      };
      
      sessions.push(newSession);
      
      // Keep only last 50 sessions to manage storage
      const recentSessions = sessions.slice(-50);
      
      const sessionsData = {
        version: this.storageVersion,
        data: recentSessions,
        updated: Date.now()
      };
      
      localStorage.setItem(this.storageKeys.sessions, JSON.stringify(sessionsData));
      console.log('Session saved successfully');
      return newSession.id;
    } catch (error) {
      console.error('Failed to save session:', error);
      return null;
    }
  }

  async getSessions() {
    try {
      const stored = localStorage.getItem(this.storageKeys.sessions);
      if (!stored) return [];

      const sessionsData = JSON.parse(stored);
      return sessionsData.data || [];
    } catch (error) {
      console.error('Failed to load sessions:', error);
      return [];
    }
  }

  async getRecentSessions(limit = 10) {
    const sessions = await this.getSessions();
    return sessions.slice(-limit).reverse(); // Most recent first
  }

  // Data export/import
  async exportData() {
    try {
      const progress = await this.getProgress();
      const settings = await this.getSettings();
      const sessions = await this.getSessions();
      
      const exportData = {
        version: this.storageVersion,
        exportDate: new Date().toISOString(),
        progress,
        settings,
        sessions: sessions.slice(-20) // Last 20 sessions only
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  async importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      // Validate data structure
      if (!data.version || !data.exportDate) {
        throw new Error('Invalid export data format');
      }
      
      // Backup current data
      const backup = await this.exportData();
      
      try {
        // Import data
        if (data.progress) {
          await this.saveProgress(data.progress);
        }
        
        if (data.settings) {
          await this.saveSettings(data.settings);
        }
        
        if (data.sessions && Array.isArray(data.sessions)) {
          const sessionsData = {
            version: this.storageVersion,
            data: data.sessions,
            updated: Date.now()
          };
          localStorage.setItem(this.storageKeys.sessions, JSON.stringify(sessionsData));
        }
        
        console.log('Data imported successfully');
        return true;
      } catch (importError) {
        // Restore backup on failure
        console.error('Import failed, restoring backup:', importError);
        await this.importData(backup);
        throw importError;
      }
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }

  // Data cleanup
  async clearAllData() {
    try {
      Object.values(this.storageKeys).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('All data cleared successfully');
      return true;
    } catch (error) {
      console.error('Failed to clear data:', error);
      return false;
    }
  }

  async clearProgress() {
    try {
      localStorage.removeItem(this.storageKeys.progress);
      console.log('Progress cleared successfully');
      return true;
    } catch (error) {
      console.error('Failed to clear progress:', error);
      return false;
    }
  }

  async cleanupOldSessions() {
    try {
      const sessions = await this.getSessions();
      const recentSessions = sessions.slice(-20); // Keep only last 20 sessions
      
      const sessionsData = {
        version: this.storageVersion,
        data: recentSessions,
        updated: Date.now()
      };
      
      localStorage.setItem(this.storageKeys.sessions, JSON.stringify(sessionsData));
      console.log(`Cleaned up ${sessions.length - recentSessions.length} old sessions`);
      return true;
    } catch (error) {
      console.error('Failed to cleanup old sessions:', error);
      return false;
    }
  }

  async cleanupIfNeeded() {
    try {
      const usage = this.getStorageUsage();
      const usagePercent = (usage.used / this.maxStorageSize) * 100;
      
      if (usagePercent > 80) {
        console.log(`Storage usage at ${usagePercent.toFixed(1)}%, cleaning up...`);
        await this.cleanupOldSessions();
      }
    } catch (error) {
      console.error('Failed to check storage usage:', error);
    }
  }

  getStorageUsage() {
    let used = 0;
    
    try {
      Object.values(this.storageKeys).forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          used += item.length * 2; // Rough estimate: 2 bytes per character
        }
      });
    } catch (error) {
      console.error('Failed to calculate storage usage:', error);
    }
    
    return {
      used,
      available: this.maxStorageSize - used,
      percentage: (used / this.maxStorageSize) * 100
    };
  }

  // Data migration
  async migrateDataIfNeeded() {
    try {
      // Check if migration is needed by examining stored version
      const progress = localStorage.getItem(this.storageKeys.progress);
      const settings = localStorage.getItem(this.storageKeys.settings);
      
      if (progress || settings) {
        // Parse and check versions
        const progressData = progress ? JSON.parse(progress) : null;
        const settingsData = settings ? JSON.parse(settings) : null;
        
        const progressVersion = progressData?.version;
        const settingsVersion = settingsData?.version;
        
        // If no version info, wrap existing data
        if (progressData && !progressVersion) {
          const migratedProgress = {
            version: this.storageVersion,
            data: progressData,
            updated: Date.now()
          };
          localStorage.setItem(this.storageKeys.progress, JSON.stringify(migratedProgress));
          console.log('Migrated progress data to new format');
        }
        
        if (settingsData && !settingsVersion) {
          const migratedSettings = {
            version: this.storageVersion,
            data: settingsData,
            updated: Date.now()
          };
          localStorage.setItem(this.storageKeys.settings, JSON.stringify(migratedSettings));
          console.log('Migrated settings data to new format');
        }
      }
    } catch (error) {
      console.error('Data migration failed:', error);
    }
  }

  // Utility methods
  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Debug methods
  async getStorageInfo() {
    const usage = this.getStorageUsage();
    const progress = await this.getProgress();
    const settings = await this.getSettings();
    const sessions = await this.getSessions();
    
    return {
      usage,
      itemCounts: {
        progress: progress ? 1 : 0,
        settings: settings ? 1 : 0,
        sessions: sessions.length
      },
      version: this.storageVersion
    };
  }
} 
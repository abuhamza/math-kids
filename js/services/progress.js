// Progress Service - Handles progress tracking, badges, and statistics
export class ProgressService {
  constructor() {
    this.progress = {
      currentLevel: 'easy',
      currentOperation: 'addition',
      totalQuestions: 0,
      correctAnswers: 0,
      totalTimeSpent: 0,
      sessionsCompleted: 0,
      currentStreak: 0,
      longestStreak: 0,
      badges: [],
      operationStats: {
        addition: { easy: [], intermediate: [], advanced: [] },
        subtraction: { easy: [], intermediate: [], advanced: [] },
        multiplication: { easy: [], intermediate: [], advanced: [] },
        division: { easy: [], intermediate: [], advanced: [] }
      },
      achievements: {
        firstCorrect: false,
        streak5: false,
        streak10: false,
        speedster: false,
        perfectGame: false,
        dedication: false,
        mathMaster: false
      },
      dailyProgress: {},
      lastSessionDate: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  // Load progress from storage
  loadProgress(savedProgress) {
    if (savedProgress) {
      this.progress = { ...this.progress, ...savedProgress };
      this.progress.updatedAt = Date.now();
      console.log('Progress loaded successfully');
    }
  }

  // Get current progress
  getProgress() {
    return { ...this.progress };
  }

  // Record an answer for a question
  recordAnswer(question, userAnswer, isCorrect) {
    this.progress.totalQuestions++;
    this.progress.updatedAt = Date.now();
    
    if (isCorrect) {
      this.progress.correctAnswers++;
      this.progress.currentStreak++;
      
      // Update longest streak
      if (this.progress.currentStreak > this.progress.longestStreak) {
        this.progress.longestStreak = this.progress.currentStreak;
      }
    } else {
      this.progress.currentStreak = 0;
    }

    // Check for achievements
    this.checkAchievements();
    
    // Record daily progress
    this.recordDailyProgress(isCorrect);
    
    console.log(`Answer recorded: ${isCorrect ? 'correct' : 'incorrect'}, streak: ${this.progress.currentStreak}`);
  }

  // Record a complete session
  recordSession(sessionData) {
    const { operation, difficulty, score, totalQuestions, timeSpent } = sessionData;
    
    this.progress.sessionsCompleted++;
    this.progress.totalTimeSpent += timeSpent;
    this.progress.lastSessionDate = Date.now();
    this.progress.updatedAt = Date.now();
    
    // Store session in operation stats
    if (!this.progress.operationStats[operation]) {
      this.progress.operationStats[operation] = { easy: [], intermediate: [], advanced: [] };
    }
    
    if (!this.progress.operationStats[operation][difficulty]) {
      this.progress.operationStats[operation][difficulty] = [];
    }
    
    const sessionRecord = {
      timestamp: Date.now(),
      score,
      totalQuestions,
      accuracy: totalQuestions > 0 ? (score / totalQuestions) * 100 : 0,
      timeSpent,
      operation,
      difficulty
    };
    
    this.progress.operationStats[operation][difficulty].push(sessionRecord);
    
    // Keep only last 20 sessions per operation/difficulty
    if (this.progress.operationStats[operation][difficulty].length > 20) {
      this.progress.operationStats[operation][difficulty] = 
        this.progress.operationStats[operation][difficulty].slice(-20);
    }
    
    // Check for session-based achievements
    this.checkSessionAchievements(sessionRecord);
    
    console.log(`Session recorded: ${operation} (${difficulty}) - ${score}/${totalQuestions}`);
  }

  // Check for achievements after each answer
  checkAchievements() {
    const achievements = this.progress.achievements;
    
    // First correct answer
    if (!achievements.firstCorrect && this.progress.correctAnswers >= 1) {
      this.unlockAchievement('firstCorrect');
    }
    
    // Streak achievements
    if (!achievements.streak5 && this.progress.currentStreak >= 5) {
      this.unlockAchievement('streak5');
    }
    
    if (!achievements.streak10 && this.progress.currentStreak >= 10) {
      this.unlockAchievement('streak10');
    }
    
    // Dedication achievement (10 sessions)
    if (!achievements.dedication && this.progress.sessionsCompleted >= 10) {
      this.unlockAchievement('dedication');
    }
    
    // Math Master (mastered all difficulty levels)
    if (!achievements.mathMaster && this.hasMasteredAllLevels()) {
      this.unlockAchievement('mathMaster');
    }
  }

  // Check for session-based achievements
  checkSessionAchievements(sessionRecord) {
    const achievements = this.progress.achievements;
    
    // Perfect game achievement
    if (!achievements.perfectGame && sessionRecord.accuracy === 100 && sessionRecord.totalQuestions >= 10) {
      this.unlockAchievement('perfectGame');
    }
    
    // Speed achievement (10 questions in under 2 minutes)
    if (!achievements.speedster && 
        sessionRecord.totalQuestions >= 10 && 
        sessionRecord.timeSpent <= 120) {
      this.unlockAchievement('speedster');
    }
  }

  // Unlock an achievement
  unlockAchievement(achievementKey) {
    if (!this.progress.achievements[achievementKey]) {
      this.progress.achievements[achievementKey] = true;
      this.progress.badges.push({
        id: achievementKey,
        unlockedAt: Date.now(),
        type: 'achievement'
      });
      
      // Dispatch achievement unlocked event
      document.dispatchEvent(new CustomEvent('achievementUnlocked', {
        detail: { achievement: achievementKey }
      }));
      
      console.log(`Achievement unlocked: ${achievementKey}`);
    }
  }

  // Check if user has mastered all difficulty levels
  hasMasteredAllLevels() {
    const operations = ['addition', 'subtraction', 'multiplication', 'division'];
    const difficulties = ['easy', 'intermediate', 'advanced'];
    
    for (const operation of operations) {
      for (const difficulty of difficulties) {
        const sessions = this.progress.operationStats[operation]?.[difficulty] || [];
        const recentSessions = sessions.slice(-5); // Last 5 sessions
        
        if (recentSessions.length < 5) return false;
        
        const averageAccuracy = recentSessions.reduce((sum, session) => sum + session.accuracy, 0) / recentSessions.length;
        
        if (averageAccuracy < 80) return false; // 80% accuracy threshold
      }
    }
    
    return true;
  }

  // Record daily progress
  recordDailyProgress(isCorrect) {
    const today = new Date().toDateString();
    
    if (!this.progress.dailyProgress[today]) {
      this.progress.dailyProgress[today] = {
        totalQuestions: 0,
        correctAnswers: 0,
        timeSpent: 0,
        sessionsStarted: 0
      };
    }
    
    this.progress.dailyProgress[today].totalQuestions++;
    if (isCorrect) {
      this.progress.dailyProgress[today].correctAnswers++;
    }
    
    // Clean up old daily progress (keep last 30 days)
    this.cleanupDailyProgress();
  }

  // Clean up old daily progress data
  cleanupDailyProgress() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const cutoffDate = thirtyDaysAgo.toDateString();
    
    Object.keys(this.progress.dailyProgress).forEach(date => {
      if (new Date(date) < new Date(cutoffDate)) {
        delete this.progress.dailyProgress[date];
      }
    });
  }

  // Get statistics
  getStatistics() {
    const totalQuestions = this.progress.totalQuestions;
    const correctAnswers = this.progress.correctAnswers;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const averageTimePerQuestion = totalQuestions > 0 ? this.progress.totalTimeSpent / totalQuestions : 0;
    
    return {
      totalQuestions,
      correctAnswers,
      accuracy: Math.round(accuracy * 10) / 10,
      totalTimeSpent: this.progress.totalTimeSpent,
      averageTimePerQuestion: Math.round(averageTimePerQuestion * 10) / 10,
      sessionsCompleted: this.progress.sessionsCompleted,
      currentStreak: this.progress.currentStreak,
      longestStreak: this.progress.longestStreak,
      badgesEarned: this.progress.badges.length,
      lastSessionDate: this.progress.lastSessionDate
    };
  }

  // Get operation-specific statistics
  getOperationStatistics(operation, difficulty = null) {
    const operationData = this.progress.operationStats[operation];
    if (!operationData) return null;
    
    if (difficulty) {
      const difficultyData = operationData[difficulty] || [];
      return this.calculateDifficultyStats(difficultyData);
    }
    
    // Calculate combined stats for all difficulties
    const allSessions = [
      ...(operationData.easy || []),
      ...(operationData.intermediate || []),
      ...(operationData.advanced || [])
    ];
    
    return this.calculateDifficultyStats(allSessions);
  }

  // Calculate statistics for a set of sessions
  calculateDifficultyStats(sessions) {
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalQuestions: 0,
        totalCorrect: 0,
        accuracy: 0,
        averageTimeSpent: 0,
        bestAccuracy: 0,
        recentTrend: 'neutral'
      };
    }
    
    const totalSessions = sessions.length;
    const totalQuestions = sessions.reduce((sum, session) => sum + session.totalQuestions, 0);
    const totalCorrect = sessions.reduce((sum, session) => sum + session.score, 0);
    const totalTimeSpent = sessions.reduce((sum, session) => sum + session.timeSpent, 0);
    const accuracies = sessions.map(session => session.accuracy);
    
    const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
    const averageTimeSpent = totalSessions > 0 ? totalTimeSpent / totalSessions : 0;
    const bestAccuracy = Math.max(...accuracies, 0);
    
    // Calculate recent trend (last 3 vs previous 3 sessions)
    let recentTrend = 'neutral';
    if (sessions.length >= 6) {
      const recentSessions = sessions.slice(-3);
      const previousSessions = sessions.slice(-6, -3);
      
      const recentAvgAccuracy = recentSessions.reduce((sum, s) => sum + s.accuracy, 0) / 3;
      const previousAvgAccuracy = previousSessions.reduce((sum, s) => sum + s.accuracy, 0) / 3;
      
      if (recentAvgAccuracy > previousAvgAccuracy + 5) {
        recentTrend = 'improving';
      } else if (recentAvgAccuracy < previousAvgAccuracy - 5) {
        recentTrend = 'declining';
      }
    }
    
    return {
      totalSessions,
      totalQuestions,
      totalCorrect,
      accuracy: Math.round(accuracy * 10) / 10,
      averageTimeSpent: Math.round(averageTimeSpent * 10) / 10,
      bestAccuracy: Math.round(bestAccuracy * 10) / 10,
      recentTrend
    };
  }

  // Get badge information
  getBadges() {
    return this.progress.badges.map(badge => ({
      ...badge,
      title: this.getBadgeTitle(badge.id),
      description: this.getBadgeDescription(badge.id),
      unlockedAt: badge.unlockedAt
    }));
  }

  // Get badge titles (these would come from i18n in a real implementation)
  getBadgeTitle(badgeId) {
    const titles = {
      firstCorrect: 'First Success',
      streak5: '5 in a Row',
      streak10: 'Perfect 10',
      speedster: 'Speed Demon',
      perfectGame: 'Perfect Score',
      dedication: 'Dedicated Learner',
      mathMaster: 'Math Master'
    };
    return titles[badgeId] || badgeId;
  }

  // Get badge descriptions
  getBadgeDescription(badgeId) {
    const descriptions = {
      firstCorrect: 'Got your first answer correct!',
      streak5: '5 correct answers in a row!',
      streak10: '10 correct answers in a row!',
      speedster: 'Answered 10 questions in under 2 minutes!',
      perfectGame: '100% accuracy in a complete game!',
      dedication: 'Completed 10 practice sessions!',
      mathMaster: 'Mastered all difficulty levels!'
    };
    return descriptions[badgeId] || '';
  }

  // Get recent progress (last 7 days)
  getRecentProgress() {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toDateString();
      
      const dayProgress = this.progress.dailyProgress[dateString] || {
        totalQuestions: 0,
        correctAnswers: 0,
        timeSpent: 0,
        sessionsStarted: 0
      };
      
      last7Days.push({
        date: dateString,
        shortDate: date.toLocaleDateString(undefined, { weekday: 'short' }),
        ...dayProgress,
        accuracy: dayProgress.totalQuestions > 0 ? 
          (dayProgress.correctAnswers / dayProgress.totalQuestions) * 100 : 0
      });
    }
    
    return last7Days;
  }

  // Reset all progress
  resetProgress() {
    this.progress = {
      currentLevel: 'easy',
      currentOperation: 'addition',
      totalQuestions: 0,
      correctAnswers: 0,
      totalTimeSpent: 0,
      sessionsCompleted: 0,
      currentStreak: 0,
      longestStreak: 0,
      badges: [],
      operationStats: {
        addition: { easy: [], intermediate: [], advanced: [] },
        subtraction: { easy: [], intermediate: [], advanced: [] },
        multiplication: { easy: [], intermediate: [], advanced: [] },
        division: { easy: [], intermediate: [], advanced: [] }
      },
      achievements: {
        firstCorrect: false,
        streak5: false,
        streak10: false,
        speedster: false,
        perfectGame: false,
        dedication: false,
        mathMaster: false
      },
      dailyProgress: {},
      lastSessionDate: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    console.log('Progress reset successfully');
  }

  // Update current settings
  updateCurrentSettings(operation, difficulty) {
    this.progress.currentOperation = operation;
    this.progress.currentLevel = difficulty;
    this.progress.updatedAt = Date.now();
  }

  // Get progress summary for dashboard
  getProgressSummary() {
    const stats = this.getStatistics();
    const recentProgress = this.getRecentProgress();
    const badges = this.getBadges();
    
    // Calculate weekly improvement
    const thisWeek = recentProgress.slice(-7);
    const weeklyQuestions = thisWeek.reduce((sum, day) => sum + day.totalQuestions, 0);
    const weeklyAccuracy = weeklyQuestions > 0 ? 
      thisWeek.reduce((sum, day) => sum + day.correctAnswers, 0) / weeklyQuestions * 100 : 0;
    
    return {
      ...stats,
      weeklyQuestions,
      weeklyAccuracy: Math.round(weeklyAccuracy * 10) / 10,
      recentProgress,
      badges,
      masteryProgress: this.calculateMasteryProgress()
    };
  }

  // Calculate mastery progress for each operation/difficulty
  calculateMasteryProgress() {
    const operations = ['addition', 'subtraction', 'multiplication', 'division'];
    const difficulties = ['easy', 'intermediate', 'advanced'];
    const masteryProgress = {};
    
    operations.forEach(operation => {
      masteryProgress[operation] = {};
      difficulties.forEach(difficulty => {
        const sessions = this.progress.operationStats[operation]?.[difficulty] || [];
        const recentSessions = sessions.slice(-5);
        
        let masteryLevel = 0;
        if (recentSessions.length >= 5) {
          const averageAccuracy = recentSessions.reduce((sum, session) => sum + session.accuracy, 0) / recentSessions.length;
          masteryLevel = Math.min(100, Math.max(0, averageAccuracy));
        } else if (recentSessions.length > 0) {
          masteryLevel = Math.min(50, recentSessions.length * 10); // Partial progress
        }
        
        masteryProgress[operation][difficulty] = {
          level: Math.round(masteryLevel),
          sessionsCompleted: sessions.length,
          isMastered: masteryLevel >= 80
        };
      });
    });
    
    return masteryProgress;
  }
} 
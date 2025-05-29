// Math Kids Web Application - Main Entry Point
import { GameService } from './services/game.js';
import { ProgressService } from './services/progress.js';
import { StorageService } from './services/storage.js';
import { AudioService } from './services/audio.js';
import { I18nService } from './utils/i18n.js';
import { AccessibilityHelper } from './utils/accessibility.js';

class MathKidsApp {
  constructor() {
    this.state = {
      currentLanguage: 'en',
      currentOperation: 'addition',
      currentDifficulty: 'easy',
      isGameActive: false,
      currentQuestion: null,
      sessionQuestions: [],
      sessionStartTime: null,
      settings: {
        audioEnabled: true,
        animationsEnabled: true,
        language: 'en'
      }
    };

    this.services = {
      game: new GameService(),
      progress: new ProgressService(),
      storage: new StorageService(),
      audio: new AudioService(),
      i18n: new I18nService()
    };

    this.accessibilityHelper = new AccessibilityHelper();
  }

  async init() {
    try {
      // Initialize services
      await this.services.storage.init();
      await this.services.i18n.init();
      this.services.audio.init();
      
      // Load saved settings and progress
      await this.loadUserData();
      
      // Set up UI
      this.setupEventListeners();
      this.renderMainMenu();
      
      // Initialize accessibility features
      this.accessibilityHelper.init();
      
      console.log('Math Kids App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showErrorMessage('Failed to load the application. Please refresh the page.');
    }
  }

  async loadUserData() {
    const savedSettings = await this.services.storage.getSettings();
    const savedProgress = await this.services.storage.getProgress();
    
    if (savedSettings) {
      this.state.settings = { ...this.state.settings, ...savedSettings };
      this.state.currentLanguage = savedSettings.language || 'en';
    }
    
    if (savedProgress) {
      this.services.progress.loadProgress(savedProgress);
    }
    
    // Set language
    await this.services.i18n.setLanguage(this.state.currentLanguage);
  }

  setupEventListeners() {
    // Navigation events
    document.addEventListener('click', this.handleNavigation.bind(this));
    document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
    
    // Form submissions
    document.addEventListener('submit', this.handleFormSubmit.bind(this));
    
    // Settings changes
    document.addEventListener('change', this.handleSettingsChange.bind(this));
    
    // Custom events
    document.addEventListener('questionAnswered', this.handleQuestionAnswered.bind(this));
    document.addEventListener('gameComplete', this.handleGameComplete.bind(this));
  }

  handleNavigation(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    
    event.preventDefault();
    const action = target.dataset.action;
    
    switch (action) {
      case 'startGame':
        this.startGame();
        break;
      case 'showDashboard':
        this.showDashboard();
        break;
      case 'showSettings':
        this.showSettings();
        break;
      case 'selectOperation':
        this.selectOperation(target.dataset.operation);
        break;
      case 'selectDifficulty':
        this.selectDifficulty(target.dataset.difficulty);
        break;
      case 'resetProgress':
        this.resetProgress();
        break;
      case 'backToMenu':
        this.renderMainMenu();
        break;
    }
  }

  handleKeyboardNavigation(event) {
    // Handle keyboard navigation for accessibility
    if (event.key === 'Escape') {
      this.renderMainMenu();
    }
    
    // Handle Enter key on focusable elements
    if (event.key === 'Enter' && event.target.hasAttribute('data-action')) {
      event.target.click();
    }
  }

  handleFormSubmit(event) {
    if (event.target.id === 'answerForm') {
      event.preventDefault();
      this.submitAnswer();
    }
  }

  handleSettingsChange(event) {
    if (event.target.name && event.target.name.startsWith('setting-')) {
      const settingName = event.target.name.replace('setting-', '');
      this.updateSetting(settingName, event.target.value || event.target.checked);
    }
  }

  async handleQuestionAnswered(event) {
    const { isCorrect, answer, question } = event.detail;
    
    // Record the answer
    this.services.progress.recordAnswer(question, answer, isCorrect);
    
    // Play audio feedback
    if (this.state.settings.audioEnabled) {
      this.services.audio.playFeedback(isCorrect);
    }
    
    // Show visual feedback
    this.showAnswerFeedback(isCorrect);
    
    // Continue to next question or complete game
    setTimeout(() => {
      if (this.services.game.hasMoreQuestions()) {
        this.loadNextQuestion();
      } else {
        this.completeGame();
      }
    }, 1500);
  }

  handleGameComplete(event) {
    const { score, totalQuestions, timeSpent } = event.detail;
    
    // Save session results
    this.services.progress.recordSession({
      operation: this.state.currentOperation,
      difficulty: this.state.currentDifficulty,
      score,
      totalQuestions,
      timeSpent,
      timestamp: Date.now()
    });
    
    // Save to storage
    this.services.storage.saveProgress(this.services.progress.getProgress());
    
    // Show results
    this.showGameResults({ score, totalQuestions, timeSpent });
  }

  renderMainMenu() {
    const i18n = this.services.i18n;
    const appContainer = document.getElementById('app');
    
    appContainer.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex flex-col items-center justify-center p-4">
        <div class="max-w-4xl mx-auto text-center">
          <h1 class="text-5xl md:text-7xl font-bold text-purple-800 mb-4 animate-bounce">
            🧮 ${i18n.t('app.title')}
          </h1>
          <p class="text-xl md:text-2xl text-gray-700 mb-8">
            ${i18n.t('app.subtitle')}
          </p>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <button 
              data-action="selectOperation" 
              data-operation="addition"
              class="operation-btn bg-green-500 hover:bg-green-600 text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
              aria-label="${i18n.t('operations.addition.title')}"
            >
              <div class="text-4xl mb-2">➕</div>
              <div class="text-xl font-semibold">${i18n.t('operations.addition.title')}</div>
            </button>
            
            <button 
              data-action="selectOperation" 
              data-operation="subtraction"
              class="operation-btn bg-blue-500 hover:bg-blue-600 text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
              aria-label="${i18n.t('operations.subtraction.title')}"
            >
              <div class="text-4xl mb-2">➖</div>
              <div class="text-xl font-semibold">${i18n.t('operations.subtraction.title')}</div>
            </button>
            
            <button 
              data-action="selectOperation" 
              data-operation="multiplication"
              class="operation-btn bg-red-500 hover:bg-red-600 text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
              aria-label="${i18n.t('operations.multiplication.title')}"
            >
              <div class="text-4xl mb-2">✖️</div>
              <div class="text-xl font-semibold">${i18n.t('operations.multiplication.title')}</div>
            </button>
            
            <button 
              data-action="selectOperation" 
              data-operation="division"
              class="operation-btn bg-orange-500 hover:bg-orange-600 text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
              aria-label="${i18n.t('operations.division.title')}"
            >
              <div class="text-4xl mb-2">➗</div>
              <div class="text-xl font-semibold">${i18n.t('operations.division.title')}</div>
            </button>
          </div>
          
          <div class="flex flex-wrap justify-center gap-4">
            <button 
              data-action="showDashboard"
              class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full text-lg font-semibold shadow-lg transition-colors"
            >
              📊 ${i18n.t('menu.dashboard')}
            </button>
            
            <button 
              data-action="showSettings"
              class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-full text-lg font-semibold shadow-lg transition-colors"
            >
              ⚙️ ${i18n.t('menu.settings')}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  selectOperation(operation) {
    this.state.currentOperation = operation;
    this.showDifficultySelector();
  }

  showDifficultySelector() {
    const i18n = this.services.i18n;
    const appContainer = document.getElementById('app');
    
    appContainer.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex flex-col items-center justify-center p-4">
        <div class="max-w-2xl mx-auto text-center">
          <h2 class="text-4xl font-bold text-purple-800 mb-8">
            ${i18n.t('difficulty.selectTitle')}
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <button 
              data-action="selectDifficulty" 
              data-difficulty="easy"
              class="difficulty-btn bg-green-500 hover:bg-green-600 text-white p-8 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <div class="text-5xl mb-4">🌱</div>
              <div class="text-2xl font-bold mb-2">${i18n.t('difficulty.easy.title')}</div>
              <div class="text-sm opacity-90">${i18n.t('difficulty.easy.description')}</div>
            </button>
            
            <button 
              data-action="selectDifficulty" 
              data-difficulty="intermediate"
              class="difficulty-btn bg-yellow-500 hover:bg-yellow-600 text-white p-8 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <div class="text-5xl mb-4">🌟</div>
              <div class="text-2xl font-bold mb-2">${i18n.t('difficulty.intermediate.title')}</div>
              <div class="text-sm opacity-90">${i18n.t('difficulty.intermediate.description')}</div>
            </button>
            
            <button 
              data-action="selectDifficulty" 
              data-difficulty="advanced"
              class="difficulty-btn bg-red-500 hover:bg-red-600 text-white p-8 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <div class="text-5xl mb-4">🚀</div>
              <div class="text-2xl font-bold mb-2">${i18n.t('difficulty.advanced.title')}</div>
              <div class="text-sm opacity-90">${i18n.t('difficulty.advanced.description')}</div>
            </button>
          </div>
          
          <button 
            data-action="backToMenu"
            class="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-full text-lg font-semibold shadow-lg transition-colors"
          >
            ← ${i18n.t('common.back')}
          </button>
        </div>
      </div>
    `;
  }

  selectDifficulty(difficulty) {
    this.state.currentDifficulty = difficulty;
    this.startGame();
  }

  startGame() {
    this.state.isGameActive = true;
    this.state.sessionStartTime = Date.now();
    this.state.sessionQuestions = [];
    
    // Initialize game with selected operation and difficulty
    this.services.game.initializeGame(
      this.state.currentOperation,
      this.state.currentDifficulty
    );
    
    this.loadNextQuestion();
  }

  showErrorMessage(message) {
    const appContainer = document.getElementById('app');
    appContainer.innerHTML = `
      <div class="min-h-screen bg-red-100 flex items-center justify-center p-4">
        <div class="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div class="text-6xl mb-4">😔</div>
          <h2 class="text-2xl font-bold text-red-600 mb-4">Oops!</h2>
          <p class="text-gray-700 mb-6">${message}</p>
          <button onclick="location.reload()" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg">
            Try Again
          </button>
        </div>
      </div>
    `;
  }

  // Placeholder methods - will be implemented in subsequent steps
  loadNextQuestion() {
    const question = this.services.game.getNextQuestion();
    if (!question) {
      this.completeGame();
      return;
    }

    const i18n = this.services.i18n;
    const appContainer = document.getElementById('app');
    const currentIndex = this.services.game.getGameState().currentQuestionIndex;
    const totalQuestions = this.services.game.getGameState().totalQuestions;

    appContainer.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex flex-col items-center justify-center p-4">
        <div class="max-w-2xl mx-auto w-full">
          <!-- Progress indicator -->
          <div class="mb-8">
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm text-gray-600">${i18n.t('game.question')} ${currentIndex + 1} ${i18n.t('game.of')} ${totalQuestions}</span>
              <span class="text-sm text-gray-600">${this.state.currentOperation} - ${this.state.currentDifficulty}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${((currentIndex + 1) / totalQuestions) * 100}%"></div>
            </div>
          </div>

          <!-- Question card -->
          <div class="card text-center mb-8">
            <h2 class="text-4xl md:text-6xl font-bold text-purple-800 mb-8">
              ${question.question} = ?
            </h2>
            
            <form id="answerForm" class="space-y-6">
              <div>
                <label for="answerInput" class="block text-xl font-semibold text-gray-700 mb-4">
                  ${i18n.t('game.yourAnswer')}
                </label>
                <input 
                  type="number" 
                  id="answerInput" 
                  class="input-field"
                  placeholder="?"
                  autocomplete="off"
                  aria-describedby="answer-hint"
                  required
                >
                <div id="answer-hint" class="sr-only">
                  ${i18n.t('accessibility.enterAnswer')}
                </div>
              </div>
              
              <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <button type="submit" class="btn-primary">
                  ${i18n.t('game.submit')}
                </button>
                <button type="button" data-action="backToMenu" class="btn-secondary">
                  ${i18n.t('common.back')}
                </button>
              </div>
            </form>
          </div>

          <!-- Hint area (initially hidden) -->
          <div id="hintArea" class="card bg-yellow-50 border-yellow-200 hidden">
            <p id="hintText" class="text-gray-700"></p>
          </div>
        </div>
      </div>
    `;

    // Store question start time
    this.currentQuestionStartTime = Date.now();
    
    // Focus on input
    setTimeout(() => {
      document.getElementById('answerInput').focus();
    }, 100);

    // Speak the question for accessibility
    if (this.state.settings.audioEnabled) {
      this.services.audio.speakEquation(question.operand1, question.operation, question.operand2);
    }
  }

  submitAnswer() {
    const answerInput = document.getElementById('answerInput');
    const answer = answerInput.value.trim();
    
    if (!answer) {
      this.showValidationError('Please enter an answer');
      return;
    }

    const numAnswer = parseFloat(answer);
    if (isNaN(numAnswer)) {
      this.showValidationError('Please enter a valid number');
      return;
    }

    // Submit to game service
    const result = this.services.game.submitAnswer(numAnswer, this.currentQuestionStartTime);
    
    // Disable form during feedback
    const form = document.getElementById('answerForm');
    const inputs = form.querySelectorAll('input, button');
    inputs.forEach(input => input.disabled = true);

    // Show feedback
    this.showAnswerFeedback(result.isCorrect, result.correctAnswer);
  }

  showAnswerFeedback(isCorrect, correctAnswer = null) {
    const i18n = this.services.i18n;
    const answerInput = document.getElementById('answerInput');
    
    // Update input styling
    answerInput.classList.remove('answer-correct', 'answer-incorrect');
    answerInput.classList.add(isCorrect ? 'answer-correct' : 'answer-incorrect');
    
    // Create feedback message
    const feedbackContainer = document.createElement('div');
    feedbackContainer.id = 'feedbackMessage';
    feedbackContainer.className = `mt-4 p-4 rounded-lg text-center font-semibold ${
      isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`;
    
    if (isCorrect) {
      feedbackContainer.innerHTML = `
        <div class="text-2xl mb-2">🎉</div>
        <div>${i18n.t('game.correct')}</div>
      `;
    } else {
      feedbackContainer.innerHTML = `
        <div class="text-2xl mb-2">🤔</div>
        <div>${i18n.t('game.incorrect')} ${correctAnswer}</div>
      `;
    }
    
    // Insert feedback after the form
    const form = document.getElementById('answerForm');
    form.parentNode.insertBefore(feedbackContainer, form.nextSibling);
    
    // Announce for screen readers
    this.services.audio.announceText(isCorrect ? i18n.t('game.correct') : `${i18n.t('game.incorrect')} ${correctAnswer}`);
    
    // Continue after delay
    setTimeout(() => {
      if (this.services.game.hasMoreQuestions()) {
        this.loadNextQuestion();
      } else {
        this.completeGame();
      }
    }, 2000);
  }

  showValidationError(message) {
    const answerInput = document.getElementById('answerInput');
    answerInput.classList.add('animate-shake-error');
    
    // Remove existing error
    const existingError = document.getElementById('validationError');
    if (existingError) {
      existingError.remove();
    }
    
    // Add error message
    const errorDiv = document.createElement('div');
    errorDiv.id = 'validationError';
    errorDiv.className = 'mt-2 text-red-600 text-sm';
    errorDiv.textContent = message;
    
    answerInput.parentNode.appendChild(errorDiv);
    
    // Remove animation class
    setTimeout(() => {
      answerInput.classList.remove('animate-shake-error');
    }, 500);
    
    // Remove error after 3 seconds
    setTimeout(() => {
      errorDiv.remove();
    }, 3000);
    
    // Play error sound
    this.services.audio.playIncorrect();
  }

  completeGame() {
    this.state.isGameActive = false;
    const results = this.services.game.finishGame();
    this.showGameResults(results);
  }

  showGameResults(results) {
    const i18n = this.services.i18n;
    const appContainer = document.getElementById('app');
    
    // Calculate additional stats
    const accuracyClass = results.accuracy >= 80 ? 'text-green-600' : 
                         results.accuracy >= 60 ? 'text-yellow-600' : 'text-red-600';
    
    appContainer.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex flex-col items-center justify-center p-4">
        <div class="max-w-2xl mx-auto text-center">
          <div class="card">
            <div class="text-6xl mb-4">${results.accuracy >= 80 ? '🏆' : results.accuracy >= 60 ? '⭐' : '👍'}</div>
            <h2 class="text-4xl font-bold text-purple-800 mb-6">
              ${i18n.t('game.gameComplete')}
            </h2>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div class="bg-blue-50 p-4 rounded-lg">
                <div class="text-2xl font-bold text-blue-600">${results.score}/${results.totalQuestions}</div>
                <div class="text-blue-800">${i18n.t('game.score')}</div>
              </div>
              
              <div class="bg-green-50 p-4 rounded-lg">
                <div class="text-2xl font-bold ${accuracyClass}">${results.accuracy}%</div>
                <div class="text-green-800">${i18n.t('game.accuracy')}</div>
              </div>
              
              <div class="bg-purple-50 p-4 rounded-lg">
                <div class="text-2xl font-bold text-purple-600">${this.formatTime(results.totalTimeSpent)}</div>
                <div class="text-purple-800">${i18n.t('game.timeSpent')}</div>
              </div>
            </div>
            
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
              <button data-action="startGame" class="btn-success">
                ${i18n.t('common.playAgain', 'Play Again')}
              </button>
              <button data-action="showDashboard" class="btn-primary">
                ${i18n.t('menu.dashboard')}
              </button>
              <button data-action="backToMenu" class="btn-secondary">
                ${i18n.t('menu.back')}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Play celebration sound
    if (this.state.settings.audioEnabled) {
      if (results.accuracy >= 80) {
        this.services.audio.playCelebration();
      } else {
        this.services.audio.playCorrect();
      }
    }
  }

  showDashboard() {
    const i18n = this.services.i18n;
    const appContainer = document.getElementById('app');
    const progressSummary = this.services.progress.getProgressSummary();
    const badges = this.services.progress.getBadges();
    
    appContainer.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4">
        <div class="max-w-6xl mx-auto">
          <div class="text-center mb-8">
            <h1 class="text-4xl font-bold text-purple-800 mb-2">
              ${i18n.t('dashboard.title')}
            </h1>
            <button data-action="backToMenu" class="btn-secondary">
              ← ${i18n.t('common.back')}
            </button>
          </div>
          
          <!-- Statistics Overview -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="card bg-blue-50">
              <div class="text-3xl font-bold text-blue-600">${progressSummary.totalQuestions}</div>
              <div class="text-blue-800">${i18n.t('dashboard.totalQuestions')}</div>
            </div>
            
            <div class="card bg-green-50">
              <div class="text-3xl font-bold text-green-600">${progressSummary.correctAnswers}</div>
              <div class="text-green-800">${i18n.t('dashboard.correctAnswers')}</div>
            </div>
            
            <div class="card bg-purple-50">
              <div class="text-3xl font-bold text-purple-600">${progressSummary.accuracy}%</div>
              <div class="text-purple-800">${i18n.t('dashboard.accuracy')}</div>
            </div>
            
            <div class="card bg-yellow-50">
              <div class="text-3xl font-bold text-yellow-600">${badges.length}</div>
              <div class="text-yellow-800">${i18n.t('dashboard.badges')}</div>
            </div>
          </div>
          
          <!-- Badges Section -->
          <div class="card mb-8">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">${i18n.t('dashboard.achievements')}</h2>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              ${this.renderBadges(badges)}
            </div>
          </div>
          
          <!-- Progress by Operation -->
          <div class="card">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">${i18n.t('dashboard.stats')}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              ${this.renderOperationStats(progressSummary.masteryProgress)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  showSettings() {
    const i18n = this.services.i18n;
    const appContainer = document.getElementById('app');
    const currentSettings = this.state.settings;
    
    appContainer.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex flex-col items-center justify-center p-4">
        <div class="max-w-2xl mx-auto w-full">
          <div class="card">
            <h2 class="text-3xl font-bold text-purple-800 mb-6 text-center">
              ${i18n.t('settings.title')}
            </h2>
            
            <form id="settingsForm" class="space-y-6">
              <!-- Language Setting -->
              <div>
                <label for="setting-language" class="block text-lg font-semibold text-gray-700 mb-2">
                  ${i18n.t('settings.language')}
                </label>
                <select name="setting-language" id="setting-language" class="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none">
                  <option value="en" ${currentSettings.language === 'en' ? 'selected' : ''}>English</option>
                  <option value="fr" ${currentSettings.language === 'fr' ? 'selected' : ''}>Français</option>
                  <option value="de" ${currentSettings.language === 'de' ? 'selected' : ''}>Deutsch</option>
                </select>
              </div>
              
              <!-- Audio Setting -->
              <div>
                <label class="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    name="setting-audioEnabled" 
                    ${currentSettings.audioEnabled ? 'checked' : ''}
                    class="w-5 h-5 text-purple-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                  >
                  <span class="text-lg font-semibold text-gray-700">${i18n.t('settings.audio')}</span>
                </label>
              </div>
              
              <!-- Animations Setting -->
              <div>
                <label class="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    name="setting-animationsEnabled" 
                    ${currentSettings.animationsEnabled ? 'checked' : ''}
                    class="w-5 h-5 text-purple-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                  >
                  <span class="text-lg font-semibold text-gray-700">${i18n.t('settings.animations')}</span>
                </label>
              </div>
              
              <!-- Reset Progress -->
              <div class="border-t pt-6">
                <h3 class="text-lg font-semibold text-gray-700 mb-4">${i18n.t('settings.resetProgress')}</h3>
                <button type="button" data-action="resetProgress" class="btn-danger">
                  🗑️ ${i18n.t('settings.resetProgress')}
                </button>
                <p class="text-sm text-gray-500 mt-2">${i18n.t('settings.confirmReset')}</p>
              </div>
            </form>
            
            <div class="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <button data-action="backToMenu" class="btn-primary">
                ← ${i18n.t('common.back')}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  updateSetting(name, value) {
    this.state.settings[name] = value;
    
    // Apply setting immediately
    switch (name) {
      case 'language':
        this.services.i18n.setLanguage(value);
        this.state.currentLanguage = value;
        break;
      case 'audioEnabled':
        this.services.audio.setEnabled(value);
        break;
      case 'animationsEnabled':
        document.body.classList.toggle('animations-disabled', !value);
        break;
    }
    
    // Save settings
    this.services.storage.saveSettings(this.state.settings);
    
    console.log(`Setting updated: ${name} = ${value}`);
  }

  resetProgress() {
    const i18n = this.services.i18n;
    
    // Show confirmation modal
    this.showModal({
      title: i18n.t('settings.resetProgress'),
      message: i18n.t('settings.confirmReset'),
      buttons: [
        {
          text: i18n.t('common.cancel'),
          class: 'btn-secondary',
          action: () => this.hideModal()
        },
        {
          text: i18n.t('common.yes'),
          class: 'btn-danger',
          action: () => {
            this.services.progress.resetProgress();
            this.services.storage.clearProgress();
            this.hideModal();
            this.showNotification(i18n.t('settings.progressReset'), 'success');
            setTimeout(() => this.renderMainMenu(), 1000);
          }
        }
      ]
    });
  }

  // Helper methods
  formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  renderBadges(badges) {
    if (badges.length === 0) {
      return '<div class="col-span-full text-center text-gray-500">No badges earned yet. Keep practicing!</div>';
    }
    
    return badges.map(badge => `
      <div class="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 text-center">
        <div class="text-3xl mb-2">🏆</div>
        <div class="font-semibold text-yellow-800">${badge.title}</div>
        <div class="text-sm text-yellow-600">${badge.description}</div>
      </div>
    `).join('');
  }

  renderOperationStats(masteryProgress) {
    const operations = ['addition', 'subtraction', 'multiplication', 'division'];
    const operationIcons = { addition: '➕', subtraction: '➖', multiplication: '✖️', division: '➗' };
    
    return operations.map(operation => {
      const stats = masteryProgress[operation];
      const totalMastery = Object.values(stats).reduce((sum, level) => sum + level.level, 0) / 3;
      
      return `
        <div class="bg-white p-4 rounded-lg border">
          <div class="text-2xl mb-2">${operationIcons[operation]}</div>
          <div class="font-semibold capitalize">${operation}</div>
          <div class="text-sm text-gray-600">Mastery: ${Math.round(totalMastery)}%</div>
          <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div class="bg-purple-500 h-2 rounded-full" style="width: ${totalMastery}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  showModal(config) {
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    
    content.innerHTML = `
      <h3 class="text-xl font-bold mb-4">${config.title}</h3>
      <p class="text-gray-700 mb-6">${config.message}</p>
      <div class="flex flex-col sm:flex-row gap-3 justify-end">
        ${config.buttons.map((btn, index) => `
          <button class="${btn.class}" data-modal-action="${index}">${btn.text}</button>
        `).join('')}
      </div>
    `;
    
    // Add event listeners for buttons
    config.buttons.forEach((btn, index) => {
      const button = content.querySelector(`[data-modal-action="${index}"]`);
      if (button) {
        button.addEventListener('click', btn.action);
      }
    });
    
    modal.classList.remove('hidden');
    
    // Focus first button
    setTimeout(() => {
      const firstButton = content.querySelector('button');
      if (firstButton) firstButton.focus();
    }, 100);
  }

  hideModal() {
    const modal = document.getElementById('modal-overlay');
    modal.classList.add('hidden');
  }

  showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    
    const bgColor = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    }[type] || 'bg-blue-500';
    
    notification.className = `${bgColor} text-white p-4 rounded-lg shadow-lg animate-slide-up`;
    notification.innerHTML = `
      <div class="flex items-center justify-between">
        <span>${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">✕</button>
      </div>
    `;
    
    container.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new MathKidsApp();
  window.mathKidsApp = app; // Expose globally for modal access
  app.init();
});

export default MathKidsApp; 
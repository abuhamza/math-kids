// Game Service - Handles question generation and game logic
export class GameService {
  constructor() {
    this.currentGame = null;
    this.questionQueue = [];
    this.currentQuestionIndex = 0;
    this.gameSettings = {
      questionsPerGame: 10,
      allowNegativeResults: false,
      maxRetries: 3
    };
  }

  initializeGame(operation, difficulty) {
    this.currentGame = {
      operation,
      difficulty,
      questions: [],
      startTime: Date.now(),
      endTime: null,
      currentQuestionIndex: 0
    };

    // Generate questions
    this.questionQueue = this.generateQuestions(operation, difficulty);
    this.currentQuestionIndex = 0;

    console.log(`Game initialized: ${operation} (${difficulty})`);
    console.log(`Generated ${this.questionQueue.length} questions`);
  }

  generateQuestions(operation, difficulty) {
    const questions = [];
    const usedCombinations = new Set();
    const { min, max } = this.getDifficultyRange(difficulty);
    
    while (questions.length < this.gameSettings.questionsPerGame) {
      let question;
      let attempts = 0;
      
      do {
        question = this.generateSingleQuestion(operation, min, max);
        attempts++;
      } while (
        usedCombinations.has(this.getQuestionKey(question)) && 
        attempts < this.gameSettings.maxRetries * 10
      );
      
      if (question && this.isValidQuestion(question)) {
        usedCombinations.add(this.getQuestionKey(question));
        questions.push({
          ...question,
          id: this.generateQuestionId(),
          timestamp: Date.now(),
          attempts: 0,
          timeSpent: 0,
          hints: []
        });
      }
    }

    return this.shuffleArray(questions);
  }

  generateSingleQuestion(operation, min, max) {
    switch (operation) {
      case 'addition':
        return this.generateAddition(min, max);
      case 'subtraction':
        return this.generateSubtraction(min, max);
      case 'multiplication':
        return this.generateMultiplication(min, max);
      case 'division':
        return this.generateDivision(min, max);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  generateAddition(min, max) {
    const operand1 = this.randomInt(min, max);
    const operand2 = this.randomInt(min, max);
    
    return {
      operation: 'addition',
      operand1,
      operand2,
      correctAnswer: operand1 + operand2,
      question: `${operand1} + ${operand2}`,
      symbol: '+'
    };
  }

  generateSubtraction(min, max) {
    let operand1 = this.randomInt(min, max);
    let operand2 = this.randomInt(min, max);
    
    // Ensure positive result unless negative results are allowed
    if (!this.gameSettings.allowNegativeResults && operand1 < operand2) {
      [operand1, operand2] = [operand2, operand1];
    }
    
    return {
      operation: 'subtraction',
      operand1,
      operand2,
      correctAnswer: operand1 - operand2,
      question: `${operand1} - ${operand2}`,
      symbol: '-'
    };
  }

  generateMultiplication(min, max) {
    // For multiplication, use smaller ranges to avoid huge numbers
    const maxMultiplier = Math.min(max, 12);
    const operand1 = this.randomInt(min, max);
    const operand2 = this.randomInt(min, maxMultiplier);
    
    return {
      operation: 'multiplication',
      operand1,
      operand2,
      correctAnswer: operand1 * operand2,
      question: `${operand1} × ${operand2}`,
      symbol: '×'
    };
  }

  generateDivision(min, max) {
    // Generate division that results in whole numbers
    const quotient = this.randomInt(min, max);
    const divisor = this.randomInt(Math.max(2, min), Math.min(max, 12));
    const dividend = quotient * divisor;
    
    return {
      operation: 'division',
      operand1: dividend,
      operand2: divisor,
      correctAnswer: quotient,
      question: `${dividend} ÷ ${divisor}`,
      symbol: '÷'
    };
  }

  getDifficultyRange(difficulty) {
    const ranges = {
      easy: { min: 1, max: 10 },
      intermediate: { min: 1, max: 50 },
      advanced: { min: 1, max: 100 }
    };
    
    return ranges[difficulty] || ranges.easy;
  }

  getCurrentQuestion() {
    if (this.currentQuestionIndex >= this.questionQueue.length) {
      return null;
    }
    
    return this.questionQueue[this.currentQuestionIndex];
  }

  hasMoreQuestions() {
    return this.currentQuestionIndex < this.questionQueue.length;
  }

  getNextQuestion() {
    if (!this.hasMoreQuestions()) {
      return null;
    }
    
    const question = this.questionQueue[this.currentQuestionIndex];
    question.startTime = Date.now();
    
    return question;
  }

  submitAnswer(answer, questionStartTime = null) {
    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) {
      throw new Error('No current question to answer');
    }

    // Prevent multiple submissions of the same question
    if (currentQuestion.hasBeenAnswered) {
      console.log('Question already answered, ignoring duplicate submission');
      return {
        isCorrect: currentQuestion.isCorrect,
        correctAnswer: currentQuestion.correctAnswer,
        timeSpent: currentQuestion.timeSpent,
        question: currentQuestion
      };
    }

    const numAnswer = parseFloat(answer);
    const isCorrect = numAnswer === currentQuestion.correctAnswer;
    
    console.log('DEBUG GameService.submitAnswer:', {
      questionIndex: this.currentQuestionIndex,
      userAnswer: numAnswer,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect: isCorrect,
      question: currentQuestion.question
    });
    
    // Calculate time spent on this question
    const timeSpent = questionStartTime ? Date.now() - questionStartTime : 0;
    currentQuestion.timeSpent = timeSpent;
    currentQuestion.attempts++;
    
    // Store the user's answer and mark as answered
    currentQuestion.userAnswer = numAnswer;
    currentQuestion.isCorrect = isCorrect;
    currentQuestion.hasBeenAnswered = true;
    
    // Add to current game questions
    this.currentGame.questions.push({...currentQuestion});
    
    // Move to next question
    this.currentQuestionIndex++;
    
    // Dispatch answer event
    document.dispatchEvent(new CustomEvent('questionAnswered', {
      detail: {
        question: currentQuestion,
        answer: numAnswer,
        isCorrect,
        timeSpent,
        questionsRemaining: this.questionQueue.length - this.currentQuestionIndex
      }
    }));

    return {
      isCorrect,
      correctAnswer: currentQuestion.correctAnswer,
      timeSpent,
      questionsRemaining: this.questionQueue.length - this.currentQuestionIndex
    };
  }

  finishGame() {
    if (!this.currentGame) {
      throw new Error('No active game to finish');
    }

    this.currentGame.endTime = Date.now();
    const duration = this.currentGame.endTime - this.currentGame.startTime;
    
    const results = this.calculateGameResults();
    
    // Dispatch game complete event
    document.dispatchEvent(new CustomEvent('gameComplete', {
      detail: {
        ...results,
        duration,
        questions: this.currentGame.questions
      }
    }));

    return results;
  }

  calculateGameResults() {
    const questions = this.currentGame.questions;
    const totalQuestions = questions.length;
    const correctAnswers = questions.filter(q => q.isCorrect).length;
    const totalTimeSpent = questions.reduce((sum, q) => sum + q.timeSpent, 0);
    
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const averageTimePerQuestion = totalQuestions > 0 ? totalTimeSpent / totalQuestions : 0;
    
    return {
      score: correctAnswers,
      totalQuestions,
      correctAnswers,
      accuracy: Math.round(accuracy * 10) / 10, // Round to 1 decimal place
      totalTimeSpent: Math.round(totalTimeSpent / 1000), // Convert to seconds
      averageTimePerQuestion: Math.round(averageTimePerQuestion / 1000),
      operation: this.currentGame.operation,
      difficulty: this.currentGame.difficulty
    };
  }

  // Utility methods
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  generateQuestionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getQuestionKey(question) {
    return `${question.operation}-${question.operand1}-${question.operand2}`;
  }

  isValidQuestion(question) {
    // Basic validation
    if (!question || question.correctAnswer === undefined) {
      return false;
    }
    
    // Check for reasonable answer ranges
    if (question.correctAnswer < 0 && !this.gameSettings.allowNegativeResults) {
      return false;
    }
    
    // Check for extremely large answers
    if (question.correctAnswer > 10000) {
      return false;
    }
    
    return true;
  }

  // Game configuration methods
  setGameSettings(settings) {
    this.gameSettings = { ...this.gameSettings, ...settings };
  }

  getGameSettings() {
    return { ...this.gameSettings };
  }

  // Get current game state
  getGameState() {
    return {
      currentGame: this.currentGame,
      currentQuestionIndex: this.currentQuestionIndex,
      totalQuestions: this.questionQueue.length,
      hasActiveGame: !!this.currentGame
    };
  }

  // Reset game
  resetGame() {
    this.currentGame = null;
    this.questionQueue = [];
    this.currentQuestionIndex = 0;
  }

  // Get hint for current question
  getHint(question) {
    if (!question) return null;

    const hints = [];
    
    switch (question.operation) {
      case 'addition':
        hints.push(`Try counting up from ${question.operand1}`);
        hints.push(`${question.operand1} + ${question.operand2} = ${question.operand1} + ${question.operand2}`);
        break;
      case 'subtraction':
        hints.push(`Try counting down from ${question.operand1}`);
        hints.push(`Think: what number plus ${question.operand2} equals ${question.operand1}?`);
        break;
      case 'multiplication':
        hints.push(`${question.operand1} groups of ${question.operand2}`);
        hints.push(`${question.operand1} × ${question.operand2} = ${question.operand1} + ${question.operand1} + ...`);
        break;
      case 'division':
        hints.push(`How many groups of ${question.operand2} fit into ${question.operand1}?`);
        hints.push(`Think: ${question.operand2} × ? = ${question.operand1}`);
        break;
    }
    
    return hints[Math.min(question.attempts || 0, hints.length - 1)];
  }

  // Generate multiple choice options for a question
  generateMultipleChoiceOptions(question, numberOfOptions = 4) {
    if (!question || question.correctAnswer === undefined) {
      return [];
    }

    const correctAnswer = question.correctAnswer;
    const distractors = new Set();
    const operation = question.operation;
    const operand1 = question.operand1;
    const operand2 = question.operand2;

    // Generate distractors based on operation type
    while (distractors.size < numberOfOptions - 1) {
      let distractor;
      
      switch (operation) {
        case 'addition':
          distractor = this.generateAdditionDistractors(operand1, operand2, correctAnswer);
          break;
        case 'subtraction':
          distractor = this.generateSubtractionDistractors(operand1, operand2, correctAnswer);
          break;
        case 'multiplication':
          distractor = this.generateMultiplicationDistractors(operand1, operand2, correctAnswer);
          break;
        case 'division':
          distractor = this.generateDivisionDistractors(operand1, operand2, correctAnswer);
          break;
        default:
          distractor = this.generateGenericDistractor(correctAnswer);
      }

      // Ensure distractor is valid and different from correct answer
      if (distractor !== correctAnswer && distractor >= 0 && distractor <= 1000) {
        distractors.add(distractor);
      }
    }

    // Combine correct answer with distractors and shuffle
    const options = [correctAnswer, ...Array.from(distractors)];
    return this.shuffleArray(options);
  }

  generateAdditionDistractors(operand1, operand2, correctAnswer) {
    const strategies = [
      () => correctAnswer + this.randomInt(1, 5), // Add a small number to correct answer
      () => correctAnswer - this.randomInt(1, 5), // Subtract a small number from correct answer
      () => operand1 + operand2 + operand1, // Common mistake: add first operand twice
      () => operand1 * operand2, // Multiply instead of add
      () => Math.abs(operand1 - operand2), // Subtract instead of add
      () => operand1 + this.randomInt(1, 10), // Add to first operand only
      () => operand2 + this.randomInt(1, 10), // Add to second operand only
    ];
    
    const strategy = strategies[this.randomInt(0, strategies.length - 1)];
    return strategy();
  }

  generateSubtractionDistractors(operand1, operand2, correctAnswer) {
    const strategies = [
      () => correctAnswer + this.randomInt(1, 5), // Add a small number
      () => correctAnswer - this.randomInt(1, 3), // Subtract a small number  
      () => operand1 + operand2, // Add instead of subtract
      () => operand2 - operand1, // Reverse the operation
      () => operand1 - this.randomInt(1, operand2), // Different subtraction
      () => Math.abs(correctAnswer + operand2), // Common mistake
      () => operand1, // Forgot to subtract
    ];
    
    const strategy = strategies[this.randomInt(0, strategies.length - 1)];
    return strategy();
  }

  generateMultiplicationDistractors(operand1, operand2, correctAnswer) {
    const strategies = [
      () => correctAnswer + operand1, // Add one more group
      () => correctAnswer - operand1, // Subtract one group
      () => operand1 + operand2, // Add instead of multiply
      () => (operand1 + 1) * operand2, // Off by one in first operand
      () => operand1 * (operand2 + 1), // Off by one in second operand
      () => operand1 * (operand2 - 1), // Off by one in second operand
      () => correctAnswer + this.randomInt(1, 10), // Random close number
    ];
    
    const strategy = strategies[this.randomInt(0, strategies.length - 1)];
    return strategy();
  }

  generateDivisionDistractors(operand1, operand2, correctAnswer) {
    const strategies = [
      () => correctAnswer + 1, // Off by one
      () => correctAnswer - 1, // Off by one
      () => Math.floor(operand1 / operand2) + 1, // Include remainder as whole number
      () => operand1 - operand2, // Subtract instead of divide
      () => operand2, // Confused operands
      () => operand1, // Forgot to divide
      () => correctAnswer * 2, // Double the answer
    ];
    
    const strategy = strategies[this.randomInt(0, strategies.length - 1)];
    return strategy();
  }

  generateGenericDistractor(correctAnswer) {
    const strategies = [
      () => correctAnswer + this.randomInt(1, 5),
      () => correctAnswer - this.randomInt(1, 5),
      () => correctAnswer * 2,
      () => Math.floor(correctAnswer / 2),
      () => correctAnswer + 10,
    ];
    
    const strategy = strategies[this.randomInt(0, strategies.length - 1)];
    return strategy();
  }
} 
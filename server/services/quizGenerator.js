/**
 * Helper to shuffle an array
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Creates a fill-in-the-blank prompt from an example sentence by masking the target word
 */
function createBlankSentence(sentence, word) {
  if (!sentence || !word) return { text: sentence, masked: false };
  
  // Create case-insensitive regex for the word or root variations
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}(ing|ed|s|es|d)?\\b`, 'gi');
  
  if (regex.test(sentence)) {
    return {
      text: sentence.replace(regex, '________'),
      masked: true
    };
  }

  // Fallback if not matched as exact word boundary
  const subRegex = new RegExp(escaped, 'gi');
  if (subRegex.test(sentence)) {
    return {
      text: sentence.replace(subRegex, '________'),
      masked: true
    };
  }

  return { text: sentence, masked: false };
}

/**
 * Generate a 5-question daily quiz for a target list of words
 * @param {Array} targetWords - Words for today (usually 5)
 * @param {Array} allPoolWords - Entire vocabulary pool to draw distractors from
 * @returns {Array} List of 5 structured questions
 */
function generateDailyQuiz(targetWords, allPoolWords) {
  if (!targetWords || targetWords.length === 0) {
    // If targetWords is empty, pick 5 random words from pool
    targetWords = shuffle(allPoolWords).slice(0, 5);
  }

  // Ensure we have a pool for distractors
  const pool = allPoolWords && allPoolWords.length >= 4 
    ? allPoolWords 
    : targetWords;

  const questions = [];
  const questionTypes = [
    'meaning_to_word',
    'word_to_meaning',
    'fill_in_blank',
    'situation_usage',
    'example_selection'
  ];

  // Up to 5 questions, one for each target word (cycling question types)
  targetWords.slice(0, 5).forEach((targetWord, index) => {
    const qType = questionTypes[index % questionTypes.length];
    
    // Distractor candidates (excluding the current target word)
    const otherCandidates = pool.filter(w => w.word.toLowerCase() !== targetWord.word.toLowerCase());
    const distractors = shuffle(otherCandidates).slice(0, 3);

    let question = null;

    if (qType === 'meaning_to_word') {
      const options = shuffle([
        targetWord.word,
        ...distractors.map(d => d.word)
      ]);
      const correctIndex = options.indexOf(targetWord.word);

      question = {
        id: `q_${targetWord.id}_${index}`,
        wordId: targetWord.id,
        targetWord: targetWord.word,
        type: 'meaning_to_word',
        typeLabel: 'Meaning → Word',
        prompt: 'Which word matches this meaning?',
        contextText: `"${targetWord.meaning}"`,
        options,
        correctIndex,
        explanation: `"${targetWord.word}" means: ${targetWord.meaning}`
      };
    } else if (qType === 'word_to_meaning') {
      const options = shuffle([
        targetWord.meaning,
        ...distractors.map(d => d.meaning)
      ]);
      const correctIndex = options.indexOf(targetWord.meaning);

      question = {
        id: `q_${targetWord.id}_${index}`,
        wordId: targetWord.id,
        targetWord: targetWord.word,
        type: 'word_to_meaning',
        typeLabel: 'Word → Meaning',
        prompt: `What is the meaning of "${targetWord.word}"?`,
        contextText: `Word: ${targetWord.word}`,
        options,
        correctIndex,
        explanation: `"${targetWord.word}" means: ${targetWord.meaning}`
      };
    } else if (qType === 'fill_in_blank') {
      const blankResult = createBlankSentence(targetWord.example, targetWord.word);
      const options = shuffle([
        targetWord.word,
        ...distractors.map(d => d.word)
      ]);
      const correctIndex = options.indexOf(targetWord.word);

      question = {
        id: `q_${targetWord.id}_${index}`,
        wordId: targetWord.id,
        targetWord: targetWord.word,
        type: 'fill_in_blank',
        typeLabel: 'Fill in the Blank',
        prompt: 'Complete the sentence with the most appropriate word:',
        contextText: blankResult.text || `The instructions were ________ and easy to follow.`,
        options,
        correctIndex,
        explanation: `Full sentence: "${targetWord.example}"`
      };
    } else if (qType === 'situation_usage') {
      // Create situation question from howToUse field
      let situationText = targetWord.howToUse;
      if (!situationText || situationText.length < 10) {
        situationText = `You want to describe: ${targetWord.meaning}`;
      } else {
        // Remove leading "Use when " or "Use at " for a natural prompt
        situationText = situationText.replace(/^Use (when|at|in|to|for) /i, '');
        situationText = situationText.charAt(0).toUpperCase() + situationText.slice(1);
      }

      const options = shuffle([
        targetWord.word,
        ...distractors.map(d => d.word)
      ]);
      const correctIndex = options.indexOf(targetWord.word);

      question = {
        id: `q_${targetWord.id}_${index}`,
        wordId: targetWord.id,
        targetWord: targetWord.word,
        type: 'situation_usage',
        typeLabel: 'Situation & Context',
        prompt: 'Which word best fits this situation?',
        contextText: situationText,
        options,
        correctIndex,
        explanation: `"${targetWord.word}" is ideal: ${targetWord.howToUse}`
      };
    } else {
      // example_selection
      const options = shuffle([
        targetWord.example,
        ...distractors.map(d => d.example)
      ]);
      const correctIndex = options.indexOf(targetWord.example);

      question = {
        id: `q_${targetWord.id}_${index}`,
        wordId: targetWord.id,
        targetWord: targetWord.word,
        type: 'example_selection',
        typeLabel: 'Sentence Context',
        prompt: `Which sentence correctly uses the word "${targetWord.word}"?`,
        contextText: `Target word: ${targetWord.word} (${targetWord.meaning})`,
        options,
        correctIndex,
        explanation: `"${targetWord.example}" correctly demonstrates "${targetWord.word}".`
      };
    }

    questions.push(question);
  });

  return questions;
}

module.exports = {
  generateDailyQuiz,
  createBlankSentence,
  shuffle
};

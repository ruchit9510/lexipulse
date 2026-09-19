/**
 * Confusing Words Learning Mode Engine
 * Curates commonly confused word pairs with definitions, memory mnemonics,
 * recognition tips, and interactive practice exercises.
 */

const CONFUSING_PAIRS = [
  {
    id: 'affect_effect',
    wordA: {
      word: 'Affect',
      partOfSpeech: 'Verb',
      meaning: 'To influence, impact, or produce a change in something.',
      example: 'The budget cuts will directly affect our project timeline.',
      howToRecognize: 'Remember RAVEN: Remember Affect is a Verb, Effect is a Noun. If you can substitute "influence", use affect.'
    },
    wordB: {
      word: 'Effect',
      partOfSpeech: 'Noun',
      meaning: 'The result or consequence of an action or cause.',
      example: 'The new policy had an immediate positive effect on team morale.',
      howToRecognize: 'Effect usually follows articles like "the", "an", or "any" (e.g. "the effect", "a ripple effect").'
    },
    exercises: [
      {
        question: 'The change in executive leadership will ___ our quarterly roadmap.',
        options: ['affect', 'effect'],
        correctIndex: 0,
        explanation: 'Use "affect" because it acts as an active verb meaning "to influence".'
      },
      {
        question: 'The medicine took ___ within thirty minutes.',
        options: ['affect', 'effect'],
        correctIndex: 1,
        explanation: '"Effect" is a noun here meaning the result, preceded by "took" (verb).'
      }
    ]
  },
  {
    id: 'accept_except',
    wordA: {
      word: 'Accept',
      partOfSpeech: 'Verb',
      meaning: 'To receive willingly or agree to something.',
      example: 'She decided to accept the job offer from the technology company.',
      howToRecognize: 'Both "Accept" and "Agree" begin with the letter A.'
    },
    wordB: {
      word: 'Except',
      partOfSpeech: 'Preposition / Conjunction',
      meaning: 'Excluding or leaving out; with the exclusion of.',
      example: 'Everyone attended the all-hands meeting except the traveling sales team.',
      howToRecognize: 'Notice the "Ex" in "Except" and "Exclude" — both mean leaving someone or something out.'
    },
    exercises: [
      {
        question: 'We agreed to ___ all client terms outlined in the revised contract.',
        options: ['accept', 'except'],
        correctIndex: 0,
        explanation: '"Accept" means to agree to or receive.'
      },
      {
        question: 'All systems are operational ___ the staging server.',
        options: ['accept', 'except'],
        correctIndex: 1,
        explanation: '"Except" indicates an exclusion.'
      }
    ]
  },
  {
    id: 'advice_advise',
    wordA: {
      word: 'Advice',
      partOfSpeech: 'Noun',
      meaning: 'Guidance, recommendations, or suggestions offered to help.',
      example: 'My mentor gave me invaluable advice on handling stakeholder conflict.',
      howToRecognize: 'Sounds like "ice". You can give or receive advice (a thing/noun).'
    },
    wordB: {
      word: 'Advise',
      partOfSpeech: 'Verb',
      meaning: 'To give counsel, inform, or recommend a course of action.',
      example: 'I would advise you to double-check the API specifications before deployment.',
      howToRecognize: 'Sounds with a "z" sound (ad-vize). It is an action you perform.'
    },
    exercises: [
      {
        question: 'Our legal counsel will ___ us on compliance regulations.',
        options: ['advice', 'advise'],
        correctIndex: 1,
        explanation: '"Advise" is the verb denoting the action of counseling.'
      },
      {
        question: 'Thank you for your constructive ___ during the sprint review.',
        options: ['advice', 'advise'],
        correctIndex: 0,
        explanation: '"Advice" is a noun representing the recommendation given.'
      }
    ]
  },
  {
    id: 'compliment_complement',
    wordA: {
      word: 'Compliment',
      partOfSpeech: 'Noun / Verb',
      meaning: 'An expression of praise, admiration, or congratulation.',
      example: 'The client gave the design team a wonderful compliment on the intuitive UI.',
      howToRecognize: 'Has an "I". Remember: "I" like receiving a compl**i**ment.'
    },
    wordB: {
      word: 'Complement',
      partOfSpeech: 'Noun / Verb',
      meaning: 'Something that completes or brings to perfection.',
      example: 'The backend optimizations perfectly complement the snappy frontend redesign.',
      howToRecognize: 'Has an "E". Remember: A compl**e**ment compl**e**tes something.'
    },
    exercises: [
      {
        question: 'His analytical skills and her creative vision ___ each other wonderfully.',
        options: ['compliment', 'complement'],
        correctIndex: 1,
        explanation: '"Complement" means to complete or enhance each other.'
      },
      {
        question: 'She received a warm ___ from the VP for delivering the project early.',
        options: ['compliment', 'complement'],
        correctIndex: 0,
        explanation: '"Compliment" means words of praise.'
      }
    ]
  },
  {
    id: 'principal_principle',
    wordA: {
      word: 'Principal',
      partOfSpeech: 'Noun / Adjective',
      meaning: 'First in importance, chief, or head of an organization.',
      example: 'The principal reason for the migration was database performance.',
      howToRecognize: 'Remember: The school princ**i-pal** is your "pal" (or the main actor).'
    },
    wordB: {
      word: 'Principle',
      partOfSpeech: 'Noun',
      meaning: 'A fundamental truth, doctrine, rule of conduct, or law.',
      example: 'The architecture adheres strictly to clean code principles.',
      howToRecognize: 'Both "Principle" and "Rule" end in "LE".'
    },
    exercises: [
      {
        question: 'Refusing the bribe was a matter of fundamental ___.',
        options: ['principal', 'principle'],
        correctIndex: 1,
        explanation: '"Principle" refers to a moral standard or rule of conduct.'
      },
      {
        question: 'He is the ___ engineer responsible for cloud infrastructure.',
        options: ['principal', 'principle'],
        correctIndex: 0,
        explanation: '"Principal" acts as an adjective meaning highest in rank or chief.'
      }
    ]
  },
  {
    id: 'discrete_discreet',
    wordA: {
      word: 'Discrete',
      partOfSpeech: 'Adjective',
      meaning: 'Individually separate, distinct, and unconnected.',
      example: 'The program is divided into discrete, reusable microservices.',
      howToRecognize: 'The "T" separates the two "E"s in discr**e**t**e**, showing separation.'
    },
    wordB: {
      word: 'Discreet',
      partOfSpeech: 'Adjective',
      meaning: 'Careful and prudent in speech or actions, keeping secrets.',
      example: 'Please be discreet when discussing the pending acquisition.',
      howToRecognize: 'The two "E"s stay closely together in discr**ee**t, keeping things confidential.'
    },
    exercises: [
      {
        question: 'The data stream is broken down into ___ packets for transmission.',
        options: ['discrete', 'discreet'],
        correctIndex: 0,
        explanation: '"Discrete" means separate and distinct individual parts.'
      },
      {
        question: 'We need to make a ___ inquiry without raising alarms.',
        options: ['discrete', 'discreet'],
        correctIndex: 1,
        explanation: '"Discreet" means cautious, careful, and confidential.'
      }
    ]
  }
];

/**
 * Get all confusing word pairs
 */
function getConfusingPairs() {
  return CONFUSING_PAIRS;
}

/**
 * Generate a practice session with mixed questions from confusing word pairs
 */
function getConfusingPracticeSession(count = 5) {
  const allExercises = [];

  CONFUSING_PAIRS.forEach(pair => {
    (pair.exercises || []).forEach(ex => {
      allExercises.push({
        pairId: pair.id,
        wordA: pair.wordA.word,
        wordB: pair.wordB.word,
        meaningA: pair.wordA.meaning,
        meaningB: pair.wordB.meaning,
        howToRecognizeA: pair.wordA.howToRecognize,
        howToRecognizeB: pair.wordB.howToRecognize,
        ...ex
      });
    });
  });

  // Shuffle and pick
  const shuffled = [...allExercises].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

module.exports = {
  getConfusingPairs,
  getConfusingPracticeSession
};

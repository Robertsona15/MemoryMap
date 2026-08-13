// Plutchik's Wheel of Emotions
export const emotions = {
  ecstasy: { label: 'Ecstasy', color: '#FFD700', level: 1, type: 'Joy' },
  joy: { label: 'Joy', color: '#FFEB3B', level: 2, type: 'Joy' },
  serenity: { label: 'Serenity', color: '#FFF9C4', level: 3, type: 'Joy' },
  
  admiration: { label: 'Admiration', color: '#8BC34A', level: 1, type: 'Trust' },
  trust: { label: 'Trust', color: '#AED581', level: 2, type: 'Trust' },
  acceptance: { label: 'Acceptance', color: '#DCEDC8', level: 3, type: 'Trust' },
  
  terror: { label: 'Terror', color: '#4CAF50', level: 1, type: 'Fear' },
  fear: { label: 'Fear', color: '#81C784', level: 2, type: 'Fear' },
  apprehension: { label: 'Apprehension', color: '#C8E6C9', level: 3, type: 'Fear' },
  
  amazement: { label: 'Amazement', color: '#03A9F4', level: 1, type: 'Surprise' },
  surprise: { label: 'Surprise', color: '#4FC3F7', level: 2, type: 'Surprise' },
  distraction: { label: 'Distraction', color: '#B3E5FC', level: 3, type: 'Surprise' },
  
  grief: { label: 'Grief', color: '#2196F3', level: 1, type: 'Sadness' },
  sadness: { label: 'Sadness', color: '#64B5F6', level: 2, type: 'Sadness' },
  pensiveness: { label: 'Pensiveness', color: '#BBDEFB', level: 3, type: 'Sadness' },
  
  loathing: { label: 'Loathing', color: '#9C27B0', level: 1, type: 'Disgust' },
  disgust: { label: 'Disgust', color: '#BA68C8', level: 2, type: 'Disgust' },
  boredom: { label: 'Boredom', color: '#E1BEE7', level: 3, type: 'Disgust' },
  
  rage: { label: 'Rage', color: '#F44336', level: 1, type: 'Anger' },
  anger: { label: 'Anger', color: '#E57373', level: 2, type: 'Anger' },
  annoyance: { label: 'Annoyance', color: '#FFCDD2', level: 3, type: 'Anger' },
  
  vigilance: { label: 'Vigilance', color: '#FF9800', level: 1, type: 'Anticipation' },
  anticipation: { label: 'Anticipation', color: '#FFB74D', level: 2, type: 'Anticipation' },
  interest: { label: 'Interest', color: '#FFE0B2', level: 3, type: 'Anticipation' }
};

export const coreEmotionTypes = ['Joy', 'Trust', 'Fear', 'Surprise', 'Sadness', 'Disgust', 'Anger', 'Anticipation'];

// Memory Categories
export const categories = [
  { id: 'person', label: 'Person' },
  { id: 'place', label: 'Place' },
  { id: 'object', label: 'Object' },
  { id: 'concept', label: 'Concept' },
  { id: 'pet', label: 'Pet' }
];

export const relationshipTypes = [
  'Self',
  'Friend',
  'Family',
  'Colleague',
  'Acquaintance',
  'Stranger'
];

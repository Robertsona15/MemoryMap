// Plutchik's Wheel of Emotions
export const emotions = {
  ecstasy: { label: 'Ecstasy', color: '#FFE600', level: 1, type: 'Joy' },
  joy: { label: 'Joy', color: '#FFEA00', level: 2, type: 'Joy' },
  serenity: { label: 'Serenity', color: '#FFF59D', level: 3, type: 'Joy' },
  
  admiration: { label: 'Admiration', color: '#64DD17', level: 1, type: 'Trust' },
  trust: { label: 'Trust', color: '#7CB342', level: 2, type: 'Trust' },
  acceptance: { label: 'Acceptance', color: '#AED581', level: 3, type: 'Trust' },
  
  terror: { label: 'Terror', color: '#00C853', level: 1, type: 'Fear' },
  fear: { label: 'Fear', color: '#4CAF50', level: 2, type: 'Fear' },
  apprehension: { label: 'Apprehension', color: '#81C784', level: 3, type: 'Fear' },
  
  amazement: { label: 'Amazement', color: '#00BFFF', level: 1, type: 'Surprise' },
  surprise: { label: 'Surprise', color: '#40C4FF', level: 2, type: 'Surprise' },
  distraction: { label: 'Distraction', color: '#81D4FA', level: 3, type: 'Surprise' },
  
  grief: { label: 'Grief', color: '#2962FF', level: 1, type: 'Sadness' },
  sadness: { label: 'Sadness', color: '#2979FF', level: 2, type: 'Sadness' },
  pensiveness: { label: 'Pensiveness', color: '#64B5F6', level: 3, type: 'Sadness' },
  
  loathing: { label: 'Loathing', color: '#AA00FF', level: 1, type: 'Disgust' },
  disgust: { label: 'Disgust', color: '#D500F9', level: 2, type: 'Disgust' },
  boredom: { label: 'Boredom', color: '#CE93D8', level: 3, type: 'Disgust' },
  
  rage: { label: 'Rage', color: '#FF0000', level: 1, type: 'Anger' },
  anger: { label: 'Anger', color: '#FF1744', level: 2, type: 'Anger' },
  annoyance: { label: 'Annoyance', color: '#EF5350', level: 3, type: 'Anger' },
  
  vigilance: { label: 'Vigilance', color: '#FF6D00', level: 1, type: 'Anticipation' },
  anticipation: { label: 'Anticipation', color: '#FF9100', level: 2, type: 'Anticipation' },
  interest: { label: 'Interest', color: '#FFB74D', level: 3, type: 'Anticipation' }
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

// Plutchik's 24 Compound Emotions (Dyads)
export const compoundEmotions = [
  // Primary Dyads (adjacent)
  { id: 'love', label: 'Love', components: ['Joy', 'Trust'] },
  { id: 'submission', label: 'Submission', components: ['Trust', 'Fear'] },
  { id: 'alarm', label: 'Alarm', components: ['Fear', 'Surprise'] },
  { id: 'disappointment', label: 'Disappointment', components: ['Surprise', 'Sadness'] },
  { id: 'remorse', label: 'Remorse', components: ['Sadness', 'Disgust'] },
  { id: 'contempt', label: 'Contempt', components: ['Disgust', 'Anger'] },
  { id: 'aggressiveness', label: 'Aggressiveness', components: ['Anger', 'Anticipation'] },
  { id: 'optimism', label: 'Optimism', components: ['Anticipation', 'Joy'] },
  // Secondary Dyads (1 emotion apart)
  { id: 'guilt', label: 'Guilt', components: ['Joy', 'Fear'] },
  { id: 'curiosity', label: 'Curiosity', components: ['Trust', 'Surprise'] },
  { id: 'despair', label: 'Despair', components: ['Fear', 'Sadness'] },
  { id: 'unbelief', label: 'Unbelief', components: ['Surprise', 'Disgust'] },
  { id: 'envy', label: 'Envy', components: ['Sadness', 'Anger'] },
  { id: 'cynicism', label: 'Cynicism', components: ['Disgust', 'Anticipation'] },
  { id: 'pride', label: 'Pride', components: ['Anger', 'Joy'] },
  { id: 'fatalism', label: 'Fatalism', components: ['Anticipation', 'Trust'] },
  // Tertiary Dyads (2 emotions apart)
  { id: 'delight', label: 'Delight', components: ['Joy', 'Surprise'] },
  { id: 'sentimentality', label: 'Sentimentality', components: ['Trust', 'Sadness'] },
  { id: 'shame', label: 'Shame', components: ['Fear', 'Disgust'] },
  { id: 'outrage', label: 'Outrage', components: ['Surprise', 'Anger'] },
  { id: 'pessimism', label: 'Pessimism', components: ['Sadness', 'Anticipation'] },
  { id: 'morbidness', label: 'Morbidness', components: ['Disgust', 'Joy'] },
  { id: 'dominance', label: 'Dominance', components: ['Anger', 'Trust'] },
  { id: 'anxiety', label: 'Anxiety', components: ['Anticipation', 'Fear'] }
];

// Semantic relationship definitions across categories
export const memoryRelationships = {
  person_person: {
    Family: ['Parent', 'Sibling', 'Child', 'Cousin', 'Grandparent', 'Spouse', 'Extended Family'],
    Friend: ['Best Friend', 'Close Friend', 'Childhood Friend', 'School Friend'],
    Colleague: ['Co-worker', 'Boss', 'Employee', 'Mentor', 'Student', 'Teacher'],
    Romantic: ['Partner', 'Ex-partner', 'Date'],
    Acquaintance: ['Neighbor', 'Classmate', 'Mutual Friend'],
    Adversary: ['Enemy', 'Rival', 'Competitor']
  },
  person_object: {
    Ownership: ['Owns', 'Previously Owned', 'Wants to Own'],
    Creation: ['Created', 'Designed', 'Built', 'Repaired'],
    Interaction: ['Uses', 'Found', 'Lost', 'Destroyed']
  },
  person_place: {
    Residence: ['Lives At', 'Used to Live At', 'Born At', 'Hometown'],
    Professional: ['Works At', 'Studied At'],
    Travel: ['Visited', 'Vacationed At', 'Wants to Visit']
  },
  person_pet: {
    Ownership: ['Owns', 'Previously Owned'],
    Interaction: ['Cares For', 'Plays With', 'Rescued']
  },
  object_place: {
    Location: ['Located At', 'Stored At', 'Hidden At'],
    Origin: ['Discovered At', 'Created At', 'Bought At']
  },
  place_place: {
    Proximity: ['Near', 'Next To', 'Same City', 'Same Country'],
    Containment: ['Inside', 'Contains'],
    Connection: ['Connected To', 'Route To']
  },
  object_object: {
    Relation: ['Part Of', 'Goes With', 'Similar To', 'Alternative To']
  },
  pet_pet: {
    Family: ['Sibling', 'Parent', 'Child'],
    Social: ['Playmate', 'Enemy']
  },
  concept_concept: {
    Relation: ['Related To', 'Opposite Of', 'Prerequisite For']
  },
  default: {
    General: ['Related To', 'Reminds Me Of', 'Part Of']
  }
};

// Default intensity values for semantic closeness
export const relationshipIntensityDefaults = {
  'Parent': 160,
  'Child': 160,
  'Spouse': 180,
  'Partner': 180,
  'Sibling': 150,
  'Best Friend': 140,
  'Grandparent': 110,
  'Extended Family': 80,
  'Cousin': 80,
  'Close Friend': 100,
  'Childhood Friend': 90,
  'School Friend': 60,
  'Co-worker': 60,
  'Boss': 70,
  'Mentor': 90,
  'Enemy': 100, // Strong negative intensity pulls them close? Or maybe keep it strong because it's a strong bond.
  'Owns': 120,
  'Created': 150,
  'Uses': 60,
  'Desires': 80,
  'Lives At': 140,
  'Hometown': 150,
  'Born At': 150,
  'Works At': 100,
  'Visited': 50,
  'Vacationed At': 70,
  'Cares For': 130,
  'Located At': 120,
  'Discovered At': 100,
  'Inside': 120,
  'Part Of': 120,
  'Sibling (Pet)': 140,
  'Related To': 50,
  'Reminds Me Of': 40
};

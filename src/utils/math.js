import { emotions, compoundEmotions } from '../data/schema';

// Map each core emotion type to an angle (in degrees)
const TYPE_ANGLES = {
  'Joy': 0,
  'Trust': 45,
  'Fear': 90,
  'Surprise': 135,
  'Sadness': 180,
  'Disgust': 225,
  'Anger': 270,
  'Anticipation': 315
};

// Map each level (intensity) to a radius (distance from center)
// Level 1 = Most intense (closer to center of Plutchik wheel usually, but we can plot it further out for a 2D graph, or closer to center)
// User agreed: established intensity levels (1, 2, 3) will dictate the radius.
// Let's say: Level 1 (Intense) = radius 100
// Level 2 = radius 200
// Level 3 (Mild) = radius 300
const LEVEL_RADIUS = {
  1: 100,
  2: 200,
  3: 300
};

/**
 * Get polar coordinates (x, y) for a given emotion.
 */
export function getEmotionCoordinate(emotionKey) {
  const emotion = emotions[emotionKey];
  if (emotion) {
    const angleDeg = TYPE_ANGLES[emotion.type];
    const radius = LEVEL_RADIUS[emotion.level];

    const angleRad = angleDeg * (Math.PI / 180);

    return {
      x: radius * Math.cos(angleRad),
      y: radius * Math.sin(angleRad)
    };
  }

  // Check if it's a compound emotion
  const compound = compoundEmotions.find(c => c.id === emotionKey);
  if (compound) {
    let sumX = 0;
    let sumY = 0;
    compound.components.forEach(compType => {
      const angleDeg = TYPE_ANGLES[compType];
      const radius = LEVEL_RADIUS[2]; // Use level 2 (base) radius for the generic component type
      const angleRad = angleDeg * (Math.PI / 180);
      sumX += radius * Math.cos(angleRad);
      sumY += radius * Math.sin(angleRad);
    });
    return {
      x: sumX / compound.components.length,
      y: sumY / compound.components.length
    };
  }

  return { x: 0, y: 0 };
}

/**
 * Calculate the target plotting point (x, y) for a memory based on its selected emotions.
 * The resulting coordinate is the vector average of all its emotions.
 */
export function getMemoryTargetCoordinate(memoryEmotions) {
  if (!memoryEmotions || memoryEmotions.length === 0) {
    return { x: 0, y: 0 }; // default to origin if no emotions tagged
  }

  let sumX = 0;
  let sumY = 0;

  memoryEmotions.forEach(key => {
    const coord = getEmotionCoordinate(key);
    sumX += coord.x;
    sumY += coord.y;
  });

  return {
    x: sumX / memoryEmotions.length,
    y: sumY / memoryEmotions.length
  };
}

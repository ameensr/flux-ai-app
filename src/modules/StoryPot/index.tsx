// src/modules/StoryPot/index.tsx
// Re-export the cached version as the default StoryPot component

export { default } from './CachedStoryPot'

// Also export the original for backward compatibility if needed
export { default as LegacyStoryPot } from './LegacyStoryPot'

import { MemoryTag } from '../types';

const STORAGE_KEY = 'v2a_memory_tags';
const MAX_TAGS = 2;

export const getTags = (): MemoryTag[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

export const addTag = (description: string): { success: boolean; message: string; tag?: MemoryTag } => {
  const currentTags = getTags();

  if (currentTags.length >= MAX_TAGS) {
    return { 
      success: false, 
      message: "Per user limit reached, upgrade to premium." 
    };
  }

  // Clean up the description (e.g., "this is my sofa" -> "Sofa")
  // Simple heuristic: remove common prefix words if present
  let name = description.replace(/^(this is|marked as|mark this as|remember this is|remember|my|the|a)\s+/gi, '').trim();
  
  // Capitalize first letter
  name = name.charAt(0).toUpperCase() + name.slice(1);

  if (name.length < 2) {
      return { success: false, message: "Tag name too short." };
  }

  const newTag: MemoryTag = {
    id: Date.now().toString(),
    name,
    timestamp: Date.now()
  };

  const updatedTags = [...currentTags, newTag];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTags));

  return { success: true, message: `Remembered ${name}.`, tag: newTag };
};

export const clearTags = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const removeTag = (id: string) => {
    const currentTags = getTags();
    const updated = currentTags.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};
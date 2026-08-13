import { get, update } from 'idb-keyval';
import { v4 as uuidv4 } from 'uuid';

export const STORE_KEY = 'memory-map-memories';

/**
 * Memory Object Structure:
 * {
 *   id: string,
 *   fileHandle: FileSystemFileHandle,
 *   fileName: string,
 *   emotions: string[], // array of emotion keys (e.g. ['joy', 'serenity'])
 *   category: string, // 'person', 'place', etc.
 *   subCategoryData: object, // { relationship: 'Friend' } or { customCharacteristics: 'Vintage' }
 *   metadata: object, // { date: string, locationStr: string }
 *   notes: string,
 *   timestamp: number
 * }
 */

export async function getMemory(id) {
  const memories = await get(STORE_KEY) || [];
  return memories.find(m => m.id === id) || null;
}

export async function saveMemory(memory) {
  if (!memory.id) {
    memory.id = uuidv4();
    memory.timestamp = Date.now();
  }
  
  await update(STORE_KEY, (val) => {
    const list = val || [];
    const index = list.findIndex(m => m.id === memory.id);
    if (index >= 0) {
      list[index] = memory;
    } else {
      list.push(memory);
    }
    return list;
  });
  
  return memory;
}

// Get all memories
export async function getAllMemories() {
  const memories = await get(STORE_KEY);
  return memories || [];
}

// Delete a memory
export async function deleteMemory(id) {
  await update(STORE_KEY, (val) => {
    const list = val || [];
    return list.filter(m => m.id !== id);
  });
}

// Request permission to re-access a file handle
export async function verifyPermission(fileHandle, readWrite = false) {
  const options = {
    mode: readWrite ? 'readwrite' : 'read'
  };
  
  // Check if we already have permission
  if ((await fileHandle.queryPermission(options)) === 'granted') {
    return true;
  }
  
  // Request permission
  if ((await fileHandle.requestPermission(options)) === 'granted') {
    return true;
  }
  
  return false;
}

// Get Object URL from FileSystemFileHandle
export async function getFileUrlFromHandle(fileHandle) {
  try {
    const hasPermission = await verifyPermission(fileHandle);
    if (!hasPermission) {
      console.warn("Permission denied for file handle");
      return null;
    }
    const file = await fileHandle.getFile();
    return URL.createObjectURL(file);
  } catch (error) {
    console.error("Error getting file from handle", error);
    return null;
  }
}

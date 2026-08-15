import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getFileUrlFromHandle } from './storage';

describe('getFileUrlFromHandle', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    global.URL = {
      createObjectURL: vi.fn(() => 'blob:test-url')
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return object url on success', async () => {
    const mockFileHandle = {
      queryPermission: vi.fn().mockResolvedValue('granted'),
      getFile: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'text/plain' }))
    };

    const result = await getFileUrlFromHandle(mockFileHandle);

    expect(result).toBe('blob:test-url');
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('should return null and log a warning if permission is denied', async () => {
    const mockFileHandle = {
      queryPermission: vi.fn().mockResolvedValue('prompt'),
      requestPermission: vi.fn().mockResolvedValue('denied')
    };

    const result = await getFileUrlFromHandle(mockFileHandle);

    expect(result).toBeNull();
    expect(console.warn).toHaveBeenCalledWith('Permission denied for file handle');
  });

  it('should return null and log an error if getFile throws', async () => {
    const mockFileHandle = {
      queryPermission: vi.fn().mockResolvedValue('granted'),
      getFile: vi.fn().mockRejectedValue(new Error('Test error'))
    };

    const result = await getFileUrlFromHandle(mockFileHandle);

    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalledWith('Error getting file from handle', expect.any(Error));
  });
});

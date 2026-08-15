import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import PhotoCard from './PhotoCard';

// Mock getFileUrlFromHandle as it uses browser APIs not available in jsdom
vi.mock('../utils/storage', () => ({
  getFileUrlFromHandle: vi.fn().mockResolvedValue('mock-url'),
}));

describe('PhotoCard', () => {
  const mockMemory = {
    id: '123',
    fileName: 'test-image.jpg',
    fileHandle: {}, // mocked
    emotions: ['joy'],
    category: 'person',
  };

  it('calls onEdit with the memory object when clicked', async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();

    render(<PhotoCard memory={mockMemory} onEdit={handleEdit} />);

    // The component wrapper has a glow-hover class
    // Instead of querying by role (it's a div without a role), we can query by some content
    // But since it's the main container, we can add a data-testid or just find the main div

    // Actually, we can click anywhere on the rendered component. Let's find some text
    const categoryText = screen.getByText('PERSON');
    await user.click(categoryText);

    expect(handleEdit).toHaveBeenCalledTimes(1);
    expect(handleEdit).toHaveBeenCalledWith(mockMemory);
  });

  it('does not crash if onEdit is not provided', async () => {
    const user = userEvent.setup();
    render(<PhotoCard memory={mockMemory} />);

    const categoryText = screen.getByText('PERSON');
    await user.click(categoryText);
    // Should not throw any errors
  });
});

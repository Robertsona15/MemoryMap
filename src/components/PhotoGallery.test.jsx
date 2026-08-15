import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PhotoGallery from './PhotoGallery';

// Mock the PhotoCard component
vi.mock('./PhotoCard', () => {
  return {
    default: ({ memory, onEdit }) => (
      <div data-testid="photo-card" onClick={() => onEdit(memory)}>
        {memory.fileName}
      </div>
    )
  };
});

describe('PhotoGallery Component', () => {
  it('returns null when memories is null', () => {
    const { container } = render(<PhotoGallery memories={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when memories is empty', () => {
    const { container } = render(<PhotoGallery memories={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a PhotoCard for each memory', () => {
    const memories = [
      { id: '1', fileName: 'test1.jpg' },
      { id: '2', fileName: 'test2.jpg' },
    ];

    render(<PhotoGallery memories={memories} />);

    const cards = screen.getAllByTestId('photo-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('test1.jpg')).toBeInTheDocument();
    expect(screen.getByText('test2.jpg')).toBeInTheDocument();
  });

  it('filters memories when "Needs Tagging" is selected', () => {
    const memories = [
      { id: '1', fileName: 'tagged.jpg', emotions: ['happy'] },
      { id: '2', fileName: 'untagged1.jpg', emotions: [] },
      { id: '3', fileName: 'untagged2.jpg' }, // missing emotions array
    ];

    render(<PhotoGallery memories={memories} />);

    // Initially shows all 3
    expect(screen.getAllByTestId('photo-card')).toHaveLength(3);

    // Change filter to "Needs Tagging"
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'needs_tagging' } });

    // Should now only show the 2 untagged memories
    const cards = screen.getAllByTestId('photo-card');
    expect(cards).toHaveLength(2);
    expect(screen.queryByText('tagged.jpg')).not.toBeInTheDocument();
    expect(screen.getByText('untagged1.jpg')).toBeInTheDocument();
    expect(screen.getByText('untagged2.jpg')).toBeInTheDocument();
  });

  it('passes onEdit callback to PhotoCard', () => {
    const onEditMock = vi.fn();
    const memories = [{ id: '1', fileName: 'test.jpg' }];

    render(<PhotoGallery memories={memories} onEdit={onEditMock} />);

    const card = screen.getByTestId('photo-card');
    fireEvent.click(card);

    expect(onEditMock).toHaveBeenCalledTimes(1);
    expect(onEditMock).toHaveBeenCalledWith(memories[0]);
  });
});

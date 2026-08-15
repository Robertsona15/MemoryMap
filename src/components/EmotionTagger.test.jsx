import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import EmotionTagger from './EmotionTagger';

describe('EmotionTagger', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders all core emotion types', () => {
    render(<EmotionTagger selectedEmotions={[]} onChange={() => {}} />);

    expect(screen.getByText('Joy', { selector: 'button' })).toBeInTheDocument();
    expect(screen.getByText('Trust', { selector: 'button' })).toBeInTheDocument();
    expect(screen.getByText('Fear', { selector: 'button' })).toBeInTheDocument();
    expect(screen.getByText('Surprise', { selector: 'button' })).toBeInTheDocument();
    expect(screen.getByText('Sadness', { selector: 'button' })).toBeInTheDocument();
    expect(screen.getByText('Disgust', { selector: 'button' })).toBeInTheDocument();
    expect(screen.getByText('Anger', { selector: 'button' })).toBeInTheDocument();
    expect(screen.getByText('Anticipation', { selector: 'button' })).toBeInTheDocument();
  });

  it('expands a core emotion type to show specific emotions', () => {
    render(<EmotionTagger selectedEmotions={[]} onChange={() => {}} />);

    // Initial state: specific emotions are not visible
    expect(screen.queryByText('Ecstasy')).not.toBeInTheDocument();

    // Click the 'Joy' category button
    fireEvent.click(screen.getByText('Joy', { selector: 'button' }));

    // Specific emotions should now be visible
    expect(screen.getByText('Ecstasy', { selector: 'button' })).toBeInTheDocument();
    const joyButtons = screen.getAllByText('Joy', { selector: 'button' });
    expect(joyButtons.length).toBeGreaterThan(1); // One for category, one for specific emotion
    expect(screen.getByText('Serenity', { selector: 'button' })).toBeInTheDocument();
  });

  it('calls onChange with the selected emotion when clicking a specific emotion', () => {
    const handleChange = vi.fn();
    render(<EmotionTagger selectedEmotions={[]} onChange={handleChange} />);

    // Expand the 'Joy' category
    fireEvent.click(screen.getByText('Joy', { selector: 'button' }));

    // Click 'Ecstasy'
    fireEvent.click(screen.getByText('Ecstasy', { selector: 'button' }));

    expect(handleChange).toHaveBeenCalledWith(['ecstasy']);
  });

  it('calls onChange with the deselected emotion when clicking an already selected emotion', () => {
    const handleChange = vi.fn();
    render(<EmotionTagger selectedEmotions={['ecstasy']} onChange={handleChange} />);

    // Expand the 'Joy' category
    fireEvent.click(screen.getByText('Joy', { selector: 'button' }));

    // Click 'Ecstasy' again to deselect
    fireEvent.click(screen.getByText('Ecstasy', { selector: 'button' }));

    expect(handleChange).toHaveBeenCalledWith([]);
  });

  it('shows compound emotions when related primary emotions are selected', () => {
    // 'joy' and 'trust' should show 'Love'
    render(<EmotionTagger selectedEmotions={['joy', 'trust']} onChange={() => {}} />);

    expect(screen.getByText('Love', { selector: 'button' })).toBeInTheDocument();
  });

  it('does not show compound emotions when related primary emotions are not selected', () => {
    render(<EmotionTagger selectedEmotions={['joy']} onChange={() => {}} />);

    expect(screen.queryByText('Love', { selector: 'button' })).not.toBeInTheDocument();
  });

  it('shows compound emotions if they are directly selected', () => {
    render(<EmotionTagger selectedEmotions={['love']} onChange={() => {}} />);

    expect(screen.getByText('Love', { selector: 'button' })).toBeInTheDocument();
  });

  it('calls onChange with the deselected compound emotion when clicking an already selected compound emotion', () => {
    const handleChange = vi.fn();
    render(<EmotionTagger selectedEmotions={['love']} onChange={handleChange} />);

    // Click 'Love' to deselect
    fireEvent.click(screen.getByText('Love', { selector: 'button' }));

    expect(handleChange).toHaveBeenCalledWith([]);
  });
});
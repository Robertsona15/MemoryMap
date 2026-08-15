import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NeuralNetworkMap from './NeuralNetworkMap';

// Mock react-force-graph-2d since it relies on canvas and doesn't work well in jsdom
vi.mock('react-force-graph-2d', () => {
  return {
    default: () => <div data-testid="force-graph-2d-mock" />
  };
});

describe('NeuralNetworkMap', () => {
  it('renders a message when memories array is empty', () => {
    const { getAllByText } = render(<NeuralNetworkMap memories={[]} onNodeClick={() => {}} />);
    expect(getAllByText('Add memories to construct your neural network.')[0]).toBeInTheDocument();
  });

  it('renders a message when memories is undefined', () => {
    const { getAllByText } = render(<NeuralNetworkMap memories={undefined} onNodeClick={() => {}} />);
    expect(getAllByText('Add memories to construct your neural network.')[0]).toBeInTheDocument();
  });
});

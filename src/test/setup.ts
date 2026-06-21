import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock matchMedia for recharts/components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock HTMLCanvasElement for chart libraries if any
HTMLCanvasElement.prototype.getContext = vi.fn();

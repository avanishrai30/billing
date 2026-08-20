import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { LoginMetamorphicBackground } from '../../../components/ui/login-metamorphic-background';

describe('LoginMetamorphicBackground Component Suite', () => {
  beforeAll(() => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }))
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('1. Renders metamorphic canvas and accessible aria attributes without crashing', () => {
    const { container } = render(
      <LoginMetamorphicBackground className="custom-metamorphic-bg" />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('data-testid', 'metamorphic-shader-canvas');

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveAttribute('aria-hidden', 'true');
    expect(wrapper).toHaveAttribute('data-testid', 'login-metamorphic-background');
    expect(wrapper.className).toContain('pointer-events-none');
    expect(wrapper.className).toContain('custom-metamorphic-bg');
  });

  it('2. Honors backdrop blur properties when supplied', () => {
    const { container } = render(
      <LoginMetamorphicBackground backdropBlurAmount="2xl" />
    );

    const wrapper = container.firstChild as HTMLElement;
    const blurLayer = wrapper.querySelector('.backdrop-blur-2xl');
    expect(blurLayer).toBeInTheDocument();
  });

  it('3. Supports prefers-reduced-motion without breaking canvas render', () => {
    (window.matchMedia as jest.Mock).mockImplementationOnce((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }));

    const { container } = render(
      <LoginMetamorphicBackground />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });
});

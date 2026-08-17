import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { SmokeyBackground } from '../../../components/ui/smokey-background';

describe('SmokeyBackground Component Suite', () => {
  beforeAll(() => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('1. Renders canvas and backdrop blur overlay without crashing', () => {
    const { container } = render(
      <SmokeyBackground color="#003882" backdropBlurAmount="md" />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveAttribute('aria-hidden', 'true');
    expect(wrapper.className).toContain('pointer-events-none');
  });

  it('2. Applies custom blur classes properly', () => {
    const { container } = render(
      <SmokeyBackground color="#1E40AF" backdropBlurAmount="lg" className="custom-class" />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-class');

    const blurLayer = wrapper.querySelector('.backdrop-blur-lg');
    expect(blurLayer).toBeInTheDocument();
  });
});

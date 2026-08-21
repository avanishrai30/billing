import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { SmokeyBackground } from '../../../components/ui/smokey-background';

describe('Login Smoky Background Component Suite', () => {
  beforeAll(() => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('1. Renders the smoky canvas and accessible hidden wrapper without crashing', () => {
    const { container } = render(
      <SmokeyBackground color="#003882" backdropBlurAmount="md" className="custom-smoky-bg" />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveAttribute('aria-hidden', 'true');
    expect(wrapper.className).toContain('pointer-events-none');
    expect(wrapper.className).toContain('custom-smoky-bg');
  });

  it('2. Honors backdrop blur properties when supplied', () => {
    const { container } = render(
      <SmokeyBackground color="#003882" backdropBlurAmount="2xl" />
    );

    const wrapper = container.firstChild as HTMLElement;
    const blurLayer = wrapper.querySelector('.backdrop-blur-2xl');
    expect(blurLayer).toBeInTheDocument();
  });

  it('3. Keeps the visual layer mounted when WebGL context creation is unavailable', () => {
    const { container } = render(
      <SmokeyBackground color="#003882" backdropBlurAmount="md" />
    );

    const canvas = container.querySelector('canvas');
    const wrapper = container.firstChild as HTMLElement;
    expect(canvas).toBeInTheDocument();
    expect(wrapper).toBeInTheDocument();
  });
});

import { describe, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
it('Renders hello world', () => {
  render(<App />);
  expect(
    screen.getByRole('heading', {
      level: 1,
    })
  ).toHaveTextContent('Login');
});

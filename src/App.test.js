import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Coral Segmentation header', () => {
  render(<App />);
  const headerElement = screen.getByRole('heading', { name: /Coral Segmentation - Image Viewer with Prompting/i });
  expect(headerElement).toBeInTheDocument();
});

import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button (RQ-001)', () => {
  it('renders and responds to click', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Press</Button>);
    fireEvent.click(screen.getByText('Press'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RecipeCard from './RecipeCard';
import { recipes } from '../data/recipes';

describe('RecipeCard', () => {
  const mockRecipe = recipes[0];
  const mockHandlers = {
    onNext: vi.fn(),
    onPrev: vi.fn(),
    onStartTimer: vi.fn(),
  };

  it('renders correctly with recipe data', () => {
    render(
      <RecipeCard
        step={mockRecipe.steps[0]}
        stepIndex={0}
        totalSteps={mockRecipe.steps.length}
        direction={1}
        {...mockHandlers}
      />
    );

    expect(screen.getByText(mockRecipe.steps[0].instruction)).toBeInTheDocument();
    expect(screen.getByText(`Step 1 / ${mockRecipe.steps.length}`)).toBeInTheDocument();
  });

  it('calls onNext when the next button is clicked', () => {
    render(
      <RecipeCard
        step={mockRecipe.steps[0]}
        stepIndex={0}
        totalSteps={mockRecipe.steps.length}
        direction={1}
        {...mockHandlers}
      />
    );

    const nextButton = screen.getByLabelText('Next step');
    fireEvent.click(nextButton);
    expect(mockHandlers.onNext).toHaveBeenCalled();
  });

  it('calls onPrev when the back button is clicked', () => {
    render(
      <RecipeCard
        step={mockRecipe.steps[1]}
        stepIndex={1}
        totalSteps={mockRecipe.steps.length}
        direction={1}
        {...mockHandlers}
      />
    );

    const prevButton = screen.getByLabelText('Previous step');
    fireEvent.click(prevButton);
    expect(mockHandlers.onPrev).toHaveBeenCalled();
  });

  it('shows the start timer button if step has timer', () => {
    const stepWithTimer = mockRecipe.steps.find(s => s.timerSeconds);
    if (!stepWithTimer) return;

    render(
      <RecipeCard
        step={stepWithTimer}
        stepIndex={0}
        totalSteps={mockRecipe.steps.length}
        direction={1}
        {...mockHandlers}
      />
    );

    const timerButton = screen.getByText('⏱️ Timer');
    expect(timerButton).toBeInTheDocument();
    fireEvent.click(timerButton);
    expect(mockHandlers.onStartTimer).toHaveBeenCalled();
  });

  it('displays a tip if provided in the step', () => {
    const stepWithTip = { ...mockRecipe.steps[0], tip: 'Test Tip' };
    
    render(
      <RecipeCard
        step={stepWithTip}
        stepIndex={0}
        totalSteps={mockRecipe.steps.length}
        direction={1}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Pro Tip:')).toBeInTheDocument();
    expect(screen.getByText('Test Tip')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ShoppingList from './ShoppingList';
import { useAccessibilityStore } from '../stores/accessibilityStore';

// Mock the store for isolation
vi.mock('../stores/accessibilityStore', () => ({
  useAccessibilityStore: vi.fn(),
}));

describe('ShoppingList', () => {
  const mockShoppingList = [
    { id: '1', name: 'Eggs', recipeTitle: 'Breakfast', completed: false },
    { id: '2', name: 'Milk', recipeTitle: 'Breakfast', completed: false },
    { id: '3', name: 'Pasta', recipeTitle: 'Dinner', completed: false },
  ];

  const mockStore = {
    shoppingList: mockShoppingList,
    toggleShoppingItem: vi.fn(),
    removeFromShoppingList: vi.fn(),
    clearShoppingList: vi.fn(),
    showToast: vi.fn(),
    speak: vi.fn(),
  };

  beforeEach(() => {
    (useAccessibilityStore as any).mockReturnValue(mockStore);
  });

  it('renders items grouped by recipe title', () => {
    render(<ShoppingList isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('Breakfast')).toBeInTheDocument();
    expect(screen.getByText('Dinner')).toBeInTheDocument();
    expect(screen.getByText('Eggs')).toBeInTheDocument();
    expect(screen.getByText('Pasta')).toBeInTheDocument();
  });

  it('calls toggleShoppingItem when checkbox is clicked', () => {
    render(<ShoppingList isOpen={true} onClose={() => {}} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(mockStore.toggleShoppingItem).toHaveBeenCalledWith('1');
  });

  it('calls clearShoppingList when the clear button is clicked', () => {
    render(<ShoppingList isOpen={true} onClose={() => {}} />);

    const clearButton = screen.getByText('Clear All Items');
    fireEvent.click(clearButton);
    expect(mockStore.clearShoppingList).toHaveBeenCalled();
  });

  it('displays empty state when list is empty', () => {
    (useAccessibilityStore as any).mockReturnValue({ ...mockStore, shoppingList: [] });
    render(<ShoppingList isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('Your list is empty.')).toBeInTheDocument();
  });
});

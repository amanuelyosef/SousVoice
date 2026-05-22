/**
 * ShoppingList.tsx — Sidebar component for managing grocery items across recipes.
 * 
 * HCI Justification:
 * 1. PERSISTENCE (Nielsen #6): Uses local storage to ensure users don't lose their
 *    list accidentally, supporting Recognition over Recall.
 * 2. MINIMALIST DESIGN (Nielsen #8): Groups items by recipe to reduce visual noise.
 * 3. ERROR RECOVERY: Provides a clear way to remove single items or clear the list.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccessibilityStore } from '../stores/accessibilityStore';

interface ShoppingListProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShoppingList: React.FC<ShoppingListProps> = ({ isOpen, onClose }) => {
  const { 
    shoppingList, 
    toggleShoppingItem, 
    removeFromShoppingList, 
    clearShoppingList,
    showToast,
    speak
  } = useAccessibilityStore();

  // Group items by recipe
  const groupedItems = shoppingList.reduce((acc, item) => {
    if (!acc[item.recipeTitle]) acc[item.recipeTitle] = [];
    acc[item.recipeTitle].push(item);
    return acc;
  }, {} as Record<string, typeof shoppingList>);

  const handleClearAll = () => {
    clearShoppingList();
    showToast('Shopping list cleared.', 'info');
    speak('Your shopping list has been cleared.');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md z-50 overflow-hidden flex flex-col shadow-2xl"
            style={{ background: 'var(--bg-primary)', borderLeft: '1px solid var(--border-subtle)' }}
          >
            {/* Header */}
            <div className="p-6 border-b border-subtle flex items-center justify-between" style={{ background: 'var(--bg-glass)' }}>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                  🛒 Shopping List
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {shoppingList.length} items from {Object.keys(groupedItems).length} recipes
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                aria-label="Close shopping list"
              >
                ✕
              </button>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {shoppingList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                  <span className="text-5xl">📄</span>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    <span>Your list is empty.</span>
                    <br/>
                    <span>Add ingredients from any recipe!</span>
                  </p>
                </div>
              ) : (
                (Object.entries(groupedItems) as [string, typeof shoppingList][]).map(([recipeTitle, items]) => (
                  <div key={recipeTitle} className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider opacity-60" style={{ color: 'var(--accent-primary)' }}>
                      {recipeTitle}
                    </h3>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <motion.div
                          key={item.id}
                          layout
                          className="flex items-center gap-3 p-3 rounded-xl transition-all group"
                          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
                        >
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => toggleShoppingItem(item.id)}
                            className="w-5 h-5 rounded-md border-2 transition-all cursor-pointer accent-accent-primary"
                          />
                          <span 
                            className={`flex-1 text-sm font-medium transition-all ${item.completed ? 'opacity-40 line-through' : ''}`}
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {item.name}
                          </span>
                          <button
                            onClick={() => removeFromShoppingList(item.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-all"
                            aria-label="Remove item"
                          >
                            🗑️
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {shoppingList.length > 0 && (
              <div className="p-6 border-t border-subtle space-y-4" style={{ background: 'var(--bg-glass)' }}>
                <button
                  onClick={handleClearAll}
                  className="w-full py-3 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'var(--bg-card)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
                >
                  Clear All Items
                </button>
                <button
                  onClick={() => {
                    window.print();
                    speak('Opening print dialog for your shopping list.');
                  }}
                  className="w-full py-3 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'var(--accent-primary)', color: 'white' }}
                >
                  🖨️ Print List
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ShoppingList;

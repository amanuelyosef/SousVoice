/**
 * ============================================================================
 * ACCESSIBILITY STORE — Zustand State Management
 * ============================================================================
 *
 * HCI Justification: Centralizing accessibility preferences in a global store
 * ensures consistent behavior across all components. This follows the
 * "Consistency & Standards" heuristic (Nielsen #4) — users shouldn't have
 * to wonder whether different words, situations, or actions mean the same thing.
 *
 * The store persists user preferences to localStorage so settings survive
 * page reloads, respecting the "Recognition over Recall" heuristic (#6).
 * ============================================================================
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ColorMode, ShoppingItem } from '../types';

// Re-export types for convenience
export type { ColorMode, RecipeStep, RecipeTag, Recipe } from '../types';

interface AccessibilityState {
  // ── Color & Vision Settings ──
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;

  // ── Typography Scaling ──
  largeText: boolean;
  toggleLargeText: () => void;

  // ── Reduced Motion ──
  // HCI: Disabling decorative animations helps users with vestibular
  // disorders or motion sensitivity (WCAG 2.3.3).
  reducedMotion: boolean;
  toggleReducedMotion: () => void;

  // ── Cooking Mode (Focus Mode) ──
  cookingMode: boolean;
  toggleCookingMode: () => void;
  enterCookingMode: () => void;
  exitCookingMode: () => void;

  // ── Recipe Selection ──
  selectedRecipeId: string | null;
  setSelectedRecipe: (id: string | null) => void;
  filterTag: string | null;
  setFilterTag: (tag: string | null) => void;
  searchQuery: string | null;
  setSearchQuery: (query: string | null) => void;

  // ── Recipe Navigation State ──
  currentStepIndex: number;
  setCurrentStep: (index: number) => void;
  nextStep: (totalSteps: number) => void;
  prevStep: () => void;

  // ── Voice Control State ──
  voiceEnabled: boolean;
  toggleVoice: () => void;
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
  lastCommand: string;
  setLastCommand: (command: string) => void;
  
  // ── Auto-Read Steps ──
  // HCI: Automatically reading steps aloud provides better accessibility
  // for users with visual impairments or those who are busy cooking.
  autoReadSteps: boolean;
  toggleAutoReadSteps: () => void;
  speak: (text: string) => void;

  // ── Timer State ──
  activeTimer: number | null; // seconds remaining
  setActiveTimer: (seconds: number | null) => void;

  // ── Toast / Error Recovery ──
  toastMessage: string | null;
  toastType: 'info' | 'error' | 'success' | null;
  showToast: (message: string, type: 'info' | 'error' | 'success') => void;
  clearToast: () => void;

  // ── Shopping List State ──
  shoppingList: ShoppingItem[];
  addToShoppingList: (ingredients: string[], recipeTitle: string) => void;
  removeFromShoppingList: (id: string) => void;
  toggleShoppingItem: (id: string) => void;
  clearShoppingList: () => void;
}

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set) => ({
      // ── Color & Vision ──
      colorMode: 'standard',
      setColorMode: (mode) => {
        document.documentElement.setAttribute('data-theme', mode);
        set({ colorMode: mode });
      },

      // ── Typography ──
      largeText: false,
      toggleLargeText: () =>
        set((state) => {
          const next = !state.largeText;
          document.documentElement.setAttribute('data-a11y-scale', String(next));
          return { largeText: next };
        }),

      // ── Reduced Motion ──
      reducedMotion: false,
      toggleReducedMotion: () => set((state) => ({ reducedMotion: !state.reducedMotion })),

      // ── Cooking Mode ──
      cookingMode: false,
      toggleCookingMode: () => set((state) => ({ cookingMode: !state.cookingMode })),
      enterCookingMode: () => set({ cookingMode: true, currentStepIndex: 0 }),
      exitCookingMode: () => set({ cookingMode: false, currentStepIndex: 0, activeTimer: null }),

      // ── Recipe Selection ──
      selectedRecipeId: null,
      setSelectedRecipe: (id) => set({ selectedRecipeId: id, cookingMode: false, currentStepIndex: 0 }),
      filterTag: null,
      setFilterTag: (tag) => set({ filterTag: tag, searchQuery: null }),
      searchQuery: null,
      setSearchQuery: (query) => set({ searchQuery: query, filterTag: null }),

      // ── Recipe Navigation ──
      currentStepIndex: 0,
      setCurrentStep: (index) => set({ currentStepIndex: index }),
      nextStep: (totalSteps) =>
        set((state) => ({
          currentStepIndex: Math.min(state.currentStepIndex + 1, totalSteps - 1),
        })),
      prevStep: () =>
        set((state) => ({
          currentStepIndex: Math.max(state.currentStepIndex - 1, 0),
        })),

      // ── Voice Control ──
      voiceEnabled: false,
      toggleVoice: () => set((state) => ({ voiceEnabled: !state.voiceEnabled })),
      isListening: false,
      setIsListening: (listening) => set({ isListening: listening }),
      lastCommand: '',
      setLastCommand: (command) => set({ lastCommand: command }),

      // ── Auto-Read ──
      autoReadSteps: true,
      toggleAutoReadSteps: () => set((state) => ({ autoReadSteps: !state.autoReadSteps })),
      speak: (text) => {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.95;
          utterance.pitch = 1;
          window.speechSynthesis.speak(utterance);
        }
      },

      // ── Timer ──
      activeTimer: null,
      setActiveTimer: (seconds) => set({ activeTimer: seconds }),

      // ── Toast / Error Recovery ──
      toastMessage: null,
      toastType: null,
      showToast: (message, type) => set({ toastMessage: message, toastType: type }),
      clearToast: () => set({ toastMessage: null, toastType: null }),

      // ── Shopping List Actions ──
      shoppingList: [],
      addToShoppingList: (ingredients, recipeTitle) => set((state) => {
        const newItems: ShoppingItem[] = ingredients.map(ing => ({
          id: crypto.randomUUID(),
          name: ing,
          recipeTitle,
          completed: false,
        }));
        return { shoppingList: [...state.shoppingList, ...newItems] };
      }),
      removeFromShoppingList: (id) => set((state) => ({
        shoppingList: state.shoppingList.filter(item => item.id !== id)
      })),
      toggleShoppingItem: (id) => set((state) => ({
        shoppingList: state.shoppingList.map(item => 
          item.id === id ? { ...item, completed: !item.completed } : item
        )
      })),
      clearShoppingList: () => set({ shoppingList: [] }),

      // ── Sorting Logic ──
      sortByDifficulty: (recipes: any[]) => {
        const difficultyMap: Record<string, number> = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
        return [...recipes].sort((a, b) => {
          const aDiff = a.tags.find((t: any) => t.type === 'difficulty')?.label || 'Medium';
          const bDiff = b.tags.find((t: any) => t.type === 'difficulty')?.label || 'Medium';
          return difficultyMap[aDiff] - difficultyMap[bDiff];
        });
      },
    }),
    {
      name: 'sousvoice-accessibility',
      // Only persist user preferences, not transient UI state
      partialize: (state) => ({
        colorMode: state.colorMode,
        largeText: state.largeText,
        voiceEnabled: state.voiceEnabled,
        autoReadSteps: state.autoReadSteps,
        reducedMotion: state.reducedMotion,
        shoppingList: state.shoppingList,
      }),
    }
  )
);

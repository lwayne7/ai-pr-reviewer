import { CachedReview } from '../types';

const HISTORY_KEY = 'ai_pr_reviewer_history';

/**
 * Saves a completed review to localStorage.
 * Maintains up to 10 most recent items, removing older duplicates.
 */
export function saveReviewToHistory(review: CachedReview): void {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const list: CachedReview[] = raw ? JSON.parse(raw) : [];
    // Filter out existing review for the same PR
    const filtered = list.filter(r => r.id !== review.id);
    // Prepend and limit to 10 items
    const updated = [review, ...filtered].slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving review to history:', e);
  }
}

/**
 * Fetches the list of cached reviews from localStorage.
 */
export function getReviewHistory(): CachedReview[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error loading review history:', e);
    return [];
  }
}

/**
 * Clears the review history from localStorage.
 */
export function clearReviewHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

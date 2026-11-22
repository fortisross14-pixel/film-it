// Reviewing an earlier phase: everything is visible, nothing can change.
import { createContext, useContext } from 'react';

export interface Review { readOnly: boolean; phaseLabel?: string; back?: () => void }
export const ReviewCtx = createContext<Review>({ readOnly: false });
export const useReview = () => useContext(ReviewCtx);
export const LOCKED_MSG = 'This phase is locked: you can look, not change';

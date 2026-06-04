import { createSlice } from '@reduxjs/toolkit';

let nextId = 1;

const toastSlice = createSlice({
  name: 'toast',
  initialState: { toasts: [] },
  reducers: {
    addToast: (state, action) => {
      state.toasts.push({
        id: nextId++,
        type: action.payload.type || 'info', // success | error | warning | info
        message: action.payload.message,
        duration: action.payload.duration || 4000,
      });
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { addToast, removeToast } = toastSlice.actions;
export default toastSlice.reducer;

// Helper action creators
export const showSuccess = (message) => addToast({ type: 'success', message });
export const showError = (message) => addToast({ type: 'error', message });
export const showWarning = (message) => addToast({ type: 'warning', message });
export const showInfo = (message) => addToast({ type: 'info', message });

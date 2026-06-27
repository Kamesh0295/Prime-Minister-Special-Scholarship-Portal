import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import applicationReducer from './slices/applicationSlice';
import toastReducer from './slices/toastSlice';
import profileReducer from './slices/profileSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    application: applicationReducer,
    toast: toastReducer,
    profile: profileReducer,
  },
});

export default store;

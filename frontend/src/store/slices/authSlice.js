import { createSlice } from '@reduxjs/toolkit';

const getInitialUser = () => {
  try {
    const user = localStorage.getItem('pmss_user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

const initialState = {
  user: getInitialUser(),
  token: localStorage.getItem('pmss_token') || null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    authSuccess: (state, action) => {
      state.loading = false;
      state.token = action.payload.token;
      state.user = action.payload.user;
      localStorage.setItem('pmss_token', action.payload.token);
      localStorage.setItem('pmss_refresh', action.payload.refreshToken);
      localStorage.setItem('pmss_user', JSON.stringify(action.payload.user));
    },
    authFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.loading = false;
      state.error = null;
      localStorage.removeItem('pmss_token');
      localStorage.removeItem('pmss_refresh');
      localStorage.removeItem('pmss_user');
    },
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('pmss_user', JSON.stringify(state.user));
    },
  },
});

export const { authStart, authSuccess, authFailure, logout, clearError, updateUser } =
  authSlice.actions;
export default authSlice.reducer;

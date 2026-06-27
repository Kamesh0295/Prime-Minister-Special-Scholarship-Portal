import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  profile: null,
  exists: false,
  loading: false,
  error: null,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    profileStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    profileSuccess: (state, action) => {
      state.loading = false;
      state.profile = action.payload.data;
      state.exists = action.payload.exists !== undefined ? action.payload.exists : true;
    },
    profileFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    clearProfileError: (state) => {
      state.error = null;
    },
    resetProfile: (state) => {
      state.profile = null;
      state.exists = false;
      state.loading = false;
      state.error = null;
    },
  },
});

export const { profileStart, profileSuccess, profileFailure, clearProfileError, resetProfile } =
  profileSlice.actions;
export default profileSlice.reducer;

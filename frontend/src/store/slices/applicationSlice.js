import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  application: null,
  status: null,
  loading: false,
  error: null,
};

const applicationSlice = createSlice({
  name: 'application',
  initialState,
  reducers: {
    applicationStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    applicationSuccess: (state, action) => {
      state.loading = false;
      state.application = action.payload;
      state.status = action.payload?.status || null;
    },
    applicationFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    clearApplication: (state) => {
      state.application = null;
      state.status = null;
      state.error = null;
      state.loading = false;
    },
    updateApplicationStatus: (state, action) => {
      if (state.application) {
        state.application.status = action.payload;
        state.status = action.payload;
      }
    },
  },
});

export const {
  applicationStart,
  applicationSuccess,
  applicationFailure,
  clearApplication,
  updateApplicationStatus,
} = applicationSlice.actions;

export default applicationSlice.reducer;

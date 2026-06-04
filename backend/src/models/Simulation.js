const mongoose = require('mongoose');

const SimulationSchema = new mongoose.Schema({
  gravityConstant: {
    type: Number,
    required: true,
  },
  objects: [
    {
      mass: { type: Number, required: true },
      position: { type: [Number], required: true }, // [x, y, z]
      velocity: { type: [Number], required: true }, // [vx, vy, vz]
    },
  ],
  duration: {
    type: Number,
    default: 0,
  },
  snapshots: [
    {
      type: mongoose.Schema.Types.Mixed,
    },
  ],
  energyLog: [
    {
      time: { type: Number, required: true },
      kinetic: { type: Number, required: true },
      potential: { type: Number, required: true },
      total: { type: Number, required: true },
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Simulation', SimulationSchema);

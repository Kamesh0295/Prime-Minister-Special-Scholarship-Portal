const express = require('express');
const Simulation = require('../models/Simulation');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/simulations
// @desc    Save a simulation snapshot
// @access  Private
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const { gravityConstant, objects, duration, snapshots, energyLog } = req.body;

    if (gravityConstant === undefined || !objects || !Array.isArray(objects)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid simulation data. Gravity constant and objects array are required.',
      });
    }

    const simulation = await Simulation.create({
      gravityConstant,
      objects,
      duration: duration || 0,
      snapshots: snapshots || [],
      energyLog: energyLog || [],
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Simulation snapshot saved successfully',
      data: simulation,
    });
  } catch (error) {
    console.error('Save simulation error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while saving simulation',
      error: error.message,
    });
  }
});

// @route   GET /api/simulations/search
// @desc    Search simulations (e.g. by creator or general list)
// @access  Private
router.get('/search', authenticateJWT, async (req, res) => {
  try {
    const { creatorId } = req.query;
    let query = {};

    if (creatorId) {
      query.createdBy = creatorId;
    } else {
      // If admin, they see all; otherwise see own simulations
      if (req.user.role !== 'admin') {
        query.createdBy = req.user._id;
      }
    }

    const simulations = await Simulation.find(query)
      .populate('createdBy', 'name email institution')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      message: 'Simulations retrieved successfully',
      data: simulations,
    });
  } catch (error) {
    console.error('Search simulations error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while searching simulations',
      error: error.message,
    });
  }
});

// @route   GET /api/simulations/:id
// @desc    Get simulation by ID
// @access  Private
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const simulation = await Simulation.findById(req.params.id)
      .populate('createdBy', 'name email institution');

    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'Simulation not found',
      });
    }

    // Access control: Viewers can see, researchers/admins can see
    return res.json({
      success: true,
      message: 'Simulation snapshot retrieved successfully',
      data: simulation,
    });
  } catch (error) {
    console.error('Get simulation by ID error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching simulation details',
      error: error.message,
    });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireEmployee } = require('../middleware/authorization');
const { handleValidationErrors } = require('../middleware/validation');
const { validateDateRange } = require('../validators/reportValidator');

// Import the service
const employeeDashboardService = require('../services/employeeDashboardService');

// Apply middleware
router.use(authenticateToken);
router.use(requireEmployee);

// Get current week overview
router.get('/current-week', async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await employeeDashboardService.getCurrentWeekOverview(userId);
    res.json(data);
  } catch (error) {
    console.error('Error fetching current week overview:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get daily work hours
router.get('/daily-hours', validateDateRange, handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;
    const data = await employeeDashboardService.getDailyWorkHours(userId, parseInt(days));
    res.json(data);
  } catch (error) {
    console.error('Error fetching daily work hours:', error);
    res.status(500).json({ error: 'Failed to fetch daily work hours' });
  }
});

// Get project time distribution
router.get('/project-time', validateDateRange, handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;
    const data = await employeeDashboardService.getProjectTimeDistribution(userId, parseInt(days));
    res.json(data);
  } catch (error) {
    console.error('Error fetching project time distribution:', error);
    res.status(500).json({ error: 'Failed to fetch project time data' });
  }
});

// Get VM usage patterns
router.get('/vm-usage', validateDateRange, handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;
    const data = await employeeDashboardService.getVMUsagePatterns(userId, parseInt(days));
    res.json(data);
  } catch (error) {
    console.error('Error fetching VM usage patterns:', error);
    res.status(500).json({ error: 'Failed to fetch VM usage data' });
  }
});

// Get task completion stats
router.get('/task-completion', validateDateRange, handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;
    const data = await employeeDashboardService.getTaskCompletionStats(userId, parseInt(days));
    res.json(data);
  } catch (error) {
    console.error('Error fetching task completion stats:', error);
    res.status(500).json({ error: 'Failed to fetch task completion data' });
  }
});

// Get work type distribution
router.get('/work-types', validateDateRange, handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;
    const data = await employeeDashboardService.getWorkTypeDistribution(userId, parseInt(days));
    res.json(data);
  } catch (error) {
    console.error('Error fetching work type distribution:', error);
    res.status(500).json({ error: 'Failed to fetch work type data' });
  }
});

// Get productivity streaks
router.get('/streaks', async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await employeeDashboardService.getProductivityStreaks(userId);
    res.json(data);
  } catch (error) {
    console.error('Error fetching productivity streaks:', error);
    res.status(500).json({ error: 'Failed to fetch productivity streaks' });
  }
});

module.exports = router; 
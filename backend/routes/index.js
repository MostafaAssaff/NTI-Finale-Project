const express = require('express');
const router = express.Router();

// استيراد routes
const todosRoutes = require('./todos');

// تعريف المسارات
router.use('/todos', todosRoutes);

// مسار للاختبار
router.get('/', (req, res) => {
  res.json({
    message: 'Todo API is working!',
    version: '1.0.0',
    endpoints: {
      todos: '/api/todos',
      health: '/health'
    }
  });
});

module.exports = router;

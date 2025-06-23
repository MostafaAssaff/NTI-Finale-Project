const express = require("express");
const cors = require('cors');
const port = process.env.PORT || 3001;  // Use environment variable or default to 3001
const routes = require("./routes");
const { createTableIfNotExists } = require("./models/todo");

const app = express();

// Enhanced CORS configuration for Kubernetes
const corsOptions = {
  origin: [
    'http://localhost:3000', // for local development
    'http://localhost:80',   // for local nginx
    // Add your frontend LoadBalancer URL
    'http://a5317b13a7dee4c4e9f02792a99226b3-2086261689.us-west-2.elb.amazonaws.com',
    // Allow internal Kubernetes service communication
    /^http:\/\/.*\.amazonaws\.com$/,
    /^http:\/\/my-app-frontend/,
    /^http:\/\/.*\.elb\.amazonaws\.com$/
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API routes
app.use("/api", routes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Todo API is running! 🚀",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check endpoint (important for Kubernetes probes)
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Server is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: port
  });
});

// Readiness probe endpoint
app.get("/ready", async (req, res) => {
  try {
    // You can add database connectivity check here
    res.json({
      status: "READY",
      message: "Server is ready to accept requests",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: "NOT_READY",
      message: "Server is not ready",
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    success: false,
    error: "Internal Server Error",
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: "Not Found",
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Server startup function
const startServer = async () => {
  try {
    console.log('🔄 Initializing DynamoDB...');
    
    // Create DynamoDB table if it doesn't exist
    const tableReady = await createTableIfNotExists();
    
    if (tableReady) {
      const server = app.listen(port, '0.0.0.0', () => {  // Listen on all interfaces
        console.log(`🚀 Server is listening on port: ${port}`);
        console.log(`📝 API endpoints available at: http://localhost:${port}/api/todos`);
        console.log(`🏥 Health check available at: http://localhost:${port}/health`);
        console.log(`✅ Ready probe available at: http://localhost:${port}/ready`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      });

      // Graceful shutdown
      const gracefulShutdown = (signal) => {
        console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
        server.close(() => {
          console.log('✅ Server closed successfully');
          process.exit(0);
        });
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } else {
      console.error('❌ Failed to initialize DynamoDB table. Server not started.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

// Global error handlers
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Start the server
startServer();

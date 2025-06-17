const express = require("express");
const cors = require('cors');
const port = 3001;
const routes = require("./routes");
const { createTableIfNotExists } = require("./models/todo");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api", routes);

// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.send("Todo API is running! 🚀");
});

// صفحة للتحقق من حالة الخدمة
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Server is running",
    timestamp: new Date().toISOString()
  });
});

// بدء تشغيل الخادم مع التأكد من وجود الجدول
const startServer = async () => {
  try {
    console.log('🔄 Initializing DynamoDB...');
    
    // إنشاء الجدول إذا لم يكن موجوداً
    const tableReady = await createTableIfNotExists();
    
    if (tableReady) {
      app.listen(port, () => {
        console.log(`🚀 Server is listening on port: ${port}`);
        console.log(`📝 API endpoints available at: http://localhost:${port}/api/todos`);
        console.log(`🏥 Health check available at: http://localhost:${port}/health`);
      });
    } else {
      console.error('❌ Failed to initialize DynamoDB table. Server not started.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

// معالجة الأخطاء غير المتوقعة
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// بدء الخادم
startServer();

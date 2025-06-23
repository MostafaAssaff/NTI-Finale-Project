const AWS = require('aws-sdk');

// إعداد DynamoDB
const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: 'us-west-2', // غيّر المنطقة حسب احتياجك
  // للتطوير المحلي، إلغي التعليق عن السطر التالي:
  // endpoint: 'http://localhost:8000'
});

// إعداد DynamoDB Service للعمليات الإدارية
const dynamodbService = new AWS.DynamoDB({
  region: 'us-west-2',
  // للتطوير المحلي، إلغي التعليق عن السطر التالي:
  // endpoint: 'http://localhost:8000'
});

const TABLE_NAME = 'Todos';

// دالة لإنشاء الجدول إذا لم يكن موجوداً
const createTableIfNotExists = async () => {
  try {
    await dynamodbService.describeTable({ TableName: TABLE_NAME }).promise();
    console.log('✅ Table "Todos" already exists');
    return true;
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      console.log('🔄 Creating table "Todos"...');
      
      const params = {
        TableName: TABLE_NAME,
        KeySchema: [
          { AttributeName: 'id', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'id', AttributeType: 'S' }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      };
      
      try {
        await dynamodbService.createTable(params).promise();
        console.log('✅ Table "Todos" created successfully');
        
        // انتظار حتى يصبح الجدول جاهزاً
        console.log('⏳ Waiting for table to be ready...');
        await dynamodbService.waitFor('tableExists', { TableName: TABLE_NAME }).promise();
        console.log('✅ Table is now ready for use');
        
        return true;
      } catch (createError) {
        console.error('❌ Error creating table:', createError);
        return false;
      }
    } else {
      console.error('❌ Error checking table:', error);
      return false;
    }
  }
};

module.exports = { 
  dynamodb, 
  dynamodbService,
  TABLE_NAME, 
  createTableIfNotExists 
};

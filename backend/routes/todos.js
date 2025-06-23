const express = require("express");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();
const { dynamodb, TABLE_NAME } = require("../models/todo");

// GET all todos (يمكن تصفية المكتملة/غير المكتملة)
router.get("/", async (req, res) => {
  try {
    let params = {
      TableName: TABLE_NAME
    };

    // إذا كان هناك فلتر للمهام غير المكتملة
    if (req.query.completed === 'false') {
      params.FilterExpression = "is_complete = :val";
      params.ExpressionAttributeValues = {
        ":val": false
      };
    } else if (req.query.completed === 'true') {
      params.FilterExpression = "is_complete = :val";
      params.ExpressionAttributeValues = {
        ":val": true
      };
    }

    const data = await dynamodb.scan(params).promise();
    
    // ترتيب النتائج حسب تاريخ الإنشاء (الأحدث أولاً)
    const sortedTodos = data.Items.sort((a, b) => 
      new Date(b.due_date) - new Date(a.due_date)
    );

    res.json({
      success: true,
      count: sortedTodos.length,
      data: sortedTodos
    });
  } catch (err) {
    console.error("DynamoDB Error (GET all):", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch todos",
      message: err.message 
    });
  }
});

// GET todo by ID
router.get("/:id", async (req, res) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      Key: {
        id: req.params.id
      }
    };

    const data = await dynamodb.get(params).promise();
    
    if (!data.Item) {
      return res.status(404).json({ 
        success: false,
        error: "Todo not found" 
      });
    }

    res.json({
      success: true,
      data: data.Item
    });
  } catch (err) {
    console.error("DynamoDB Error (GET by ID):", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch todo",
      message: err.message 
    });
  }
});

// CREATE new todo
router.post("/", async (req, res) => {
  try {
    // التحقق من البيانات المطلوبة
    const { title, description } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: "Title and description are required"
      });
    }

    const todo = {
      id: uuidv4(),
      title: title.trim(),
      description: description.trim(),
      is_complete: req.body.is_complete || false,
      due_date: req.body.due_date || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const params = {
      TableName: TABLE_NAME,
      Item: todo
    };

    await dynamodb.put(params).promise();
    
    res.status(201).json({
      success: true,
      message: "Todo created successfully",
      data: todo
    });
  } catch (err) {
    console.error("DynamoDB Error (POST create):", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to create todo",
      message: err.message 
    });
  }
});

// UPDATE todo (PATCH for partial updates)
router.patch("/:id", async (req, res) => {
  try {
    const { title, description, is_complete, due_date } = req.body;
    
    // التحقق من وجود البيانات للتحديث
    if (!title && !description && is_complete === undefined && !due_date) {
      return res.status(400).json({
        success: false,
        error: "At least one field is required for update"
      });
    }

    const updateExpressions = [];
    const expressionAttributeValues = {};

    if (title !== undefined) {
      updateExpressions.push("title = :title");
      expressionAttributeValues[":title"] = title.trim();
    }
    if (description !== undefined) {
      updateExpressions.push("description = :description");
      expressionAttributeValues[":description"] = description.trim();
    }
    if (is_complete !== undefined) {
      updateExpressions.push("is_complete = :is_complete");
      expressionAttributeValues[":is_complete"] = is_complete;
    }
    if (due_date !== undefined) {
      updateExpressions.push("due_date = :due_date");
      expressionAttributeValues[":due_date"] = due_date;
    }

    // إضافة تاريخ التحديث
    updateExpressions.push("updated_at = :updated_at");
    expressionAttributeValues[":updated_at"] = new Date().toISOString();

    const params = {
      TableName: TABLE_NAME,
      Key: { id: req.params.id },
      UpdateExpression: "SET " + updateExpressions.join(", "),
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW"
    };

    const result = await dynamodb.update(params).promise();
    
    res.json({
      success: true,
      message: "Todo updated successfully",
      data: result.Attributes
    });
  } catch (err) {
    console.error("DynamoDB Error (PATCH update):", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to update todo",
      message: err.message 
    });
  }
});

// UPDATE todo (PUT for complete replacement)
router.put("/:id", async (req, res) => {
  try {
    const { title, description, is_complete, due_date } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: "Title and description are required"
      });
    }

    const todo = {
      id: req.params.id,
      title: title.trim(),
      description: description.trim(),
      is_complete: is_complete || false,
      due_date: due_date || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const params = {
      TableName: TABLE_NAME,
      Item: todo
    };

    await dynamodb.put(params).promise();
    
    res.json({
      success: true,
      message: "Todo replaced successfully",
      data: todo
    });
  } catch (err) {
    console.error("DynamoDB Error (PUT replace):", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to replace todo",
      message: err.message 
    });
  }
});

// DELETE todo
router.delete("/:id", async (req, res) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      Key: { id: req.params.id },
      ReturnValues: "ALL_OLD"
    };

    const result = await dynamodb.delete(params).promise();
    
    if (!result.Attributes) {
      return res.status(404).json({
        success: false,
        error: "Todo not found"
      });
    }

    res.json({
      success: true,
      message: "Todo deleted successfully",
      data: result.Attributes
    });
  } catch (err) {
    console.error("DynamoDB Error (DELETE):", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to delete todo",
      message: err.message 
    });
  }
});

// GET todo statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const params = {
      TableName: TABLE_NAME
    };

    const data = await dynamodb.scan(params).promise();
    const todos = data.Items;

    const stats = {
      total: todos.length,
      completed: todos.filter(todo => todo.is_complete).length,
      pending: todos.filter(todo => !todo.is_complete).length,
      overdue: todos.filter(todo => 
        !todo.is_complete && new Date(todo.due_date) < new Date()
      ).length
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error("DynamoDB Error (GET stats):", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch statistics",
      message: err.message 
    });
  }
});

module.exports = router;

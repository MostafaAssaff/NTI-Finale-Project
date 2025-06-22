// src/components/home.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Button,
  Card,
  CardBody,
  CardTitle,
  ListGroup,
  ListGroupItem,
  Modal,
  ModalBody,
  ModalHeader,
  Alert,
} from "reactstrap";
import TodoForm from "./todo-form";

// ✅ Updated API URL to use port 3001 and proper fallbacks
const API_URL = process.env.REACT_APP_API_URL || 
               'http://ab88cbab472af4627805c2ff8d125066-1728297530.us-west-2.elb.amazonaws.com:3001/api';

console.log('🔗 Using API URL:', API_URL);

const Home = () => {
  const [todos, setTodos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getTodos();
  }, []);

  const getTodos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📡 Fetching todos from:', `${API_URL}/todos`);
      const res = await axios.get(`${API_URL}/todos`);
      
      console.log('📥 Backend response:', res.data);
      
      // ✅ Handle your backend response format: { success: true, data: [...] }
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        setTodos(res.data.data);
        console.log('✅ Todos loaded successfully:', res.data.data.length);
      } else if (Array.isArray(res.data)) {
        // Fallback for direct array response
        setTodos(res.data);
      } else if (res.data?.todos && Array.isArray(res.data.todos)) {
        // Another fallback format
        setTodos(res.data.todos);
      } else {
        console.warn('⚠️ Unexpected response format:', res.data);
        setTodos([]);
      }
    } catch (err) {
      console.error("❌ Error fetching todos:", err);
      
      let errorMessage = 'Failed to load todos';
      if (err.response) {
        // Server responded with error status
        errorMessage = err.response.data?.message || err.response.data?.error || `Server error: ${err.response.status}`;
      } else if (err.request) {
        // Network error
        errorMessage = 'Network error - cannot reach server';
      } else {
        // Other error
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setTodos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async (id) => {
    try {
      console.log('🔄 Updating todo:', id);
      await axios.patch(`${API_URL}/todos/${id}`, { is_complete: true });
      await getTodos(); // Refresh the list
    } catch (err) {
      console.error("❌ Error updating todo:", err);
      // Show user-friendly error
      alert('Failed to update todo. Please try again.');
    }
  };

  const handleNewTodo = async (todo) => {
    try {
      console.log('➕ Creating new todo:', todo);
      await axios.post(`${API_URL}/todos`, todo);
      await getTodos(); // Refresh the list
      setModalOpen(false);
    } catch (err) {
      console.error("❌ Error creating todo:", err);
      // Show user-friendly error
      alert('Failed to create todo. Please try again.');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardBody>
          <CardTitle tag="h1">Todos</CardTitle>
          <div className="d-flex justify-content-center">
            <div className="spinner-border" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
          <p className="text-center mt-2">Loading todos...</p>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardBody>
          <CardTitle tag="h1">Todos</CardTitle>
          <Alert color="danger">
            <h4 className="alert-heading">Connection Error</h4>
            <p>{error}</p>
            <hr />
            <p className="mb-0">
              <strong>API URL:</strong> {API_URL}
            </p>
            <Button onClick={getTodos} color="primary" className="mt-3">
              🔄 Retry
            </Button>
          </Alert>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardBody>
          <CardTitle tag="h1">
            Todos 
            <span className="badge badge-secondary ms-2">
              {todos.length}
            </span>
          </CardTitle>
          
          {todos.length > 0 ? (
            <ListGroup className="mb-3">
              {todos.map((todo) => (
                <ListGroupItem 
                  key={todo.id} 
                  className={`d-flex align-items-center ${todo.is_complete ? 'list-group-item-success' : ''}`}
                >
                  <div className="form-check me-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`todo-${todo.id}`}
                      onChange={() => handleClick(todo.id)}
                      checked={todo.is_complete}
                    />
                  </div>
                  <div className="flex-grow-1">
                    <h5 className={`mb-1 ${todo.is_complete ? 'text-decoration-line-through text-muted' : ''}`}>
                      {todo.title}
                    </h5>
                    <p className={`mb-1 ${todo.is_complete ? 'text-muted' : ''}`}>
                      {todo.description}
                    </p>
                    <small className="text-muted">
                      Due: {new Date(todo.due_date).toLocaleDateString()}
                    </small>
                  </div>
                </ListGroupItem>
              ))}
            </ListGroup>
          ) : (
            <Alert color="info">
              <h4 className="alert-heading">No todos yet!</h4>
              <p>Start by adding your first todo item.</p>
            </Alert>
          )}
          
          <Button 
            onClick={() => setModalOpen(true)} 
            color="primary" 
            size="lg"
            className="w-100"
          >
            ➕ Add New Todo
          </Button>
        </CardBody>
      </Card>

      <Modal isOpen={modalOpen} toggle={() => setModalOpen(!modalOpen)}>
        <ModalHeader toggle={() => setModalOpen(!modalOpen)}>
          Add New Todo
        </ModalHeader>
        <ModalBody>
          <TodoForm saveTodo={handleNewTodo} />
        </ModalBody>
      </Modal>
    </>
  );
};

export default Home;

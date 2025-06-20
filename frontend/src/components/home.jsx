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
} from "reactstrap";
import TodoForm from "./todo-form";

// Add fallback URL in case environment variable is not set
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Home = () => {
  // Initialize as empty array instead of empty array
  const [todos, setTodos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getData = async () => {
      await getTodos();
    };
    getData();
  }, []);

  const getTodos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching from:', `${API_URL}/todos`); // Debug log
      
      const res = await axios.get(`${API_URL}/todos`);
      
      console.log('API Response:', res.data); // Debug log
      console.log('Response type:', typeof res.data); // Debug log
      console.log('Is array:', Array.isArray(res.data)); // Debug log
      
      // Ensure we always set an array
      if (Array.isArray(res.data)) {
        setTodos(res.data);
      } else if (res.data && res.data.todos && Array.isArray(res.data.todos)) {
        // In case API returns {todos: [...]}
        setTodos(res.data.todos);
      } else {
        console.warn('API did not return an array:', res.data);
        setTodos([]);
      }
    } catch (err) {
      console.error('API Error:', err);
      setError(err.message);
      setTodos([]); // Ensure todos is always an array
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async (id) => {
    try {
      await axios.patch(`${API_URL}/todos/${id}`, {
        is_complete: true,
      });
      await getTodos();
    } catch (err) {
      console.error("Error updating todo:", err);
    }
  };

  const handleNewTodo = async (todo) => {
    try {
      await axios.post(`${API_URL}/todos`, todo);
      await getTodos();
      setModalOpen(false);
    } catch (err) {
      console.error("Error creating todo:", err);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <Card>
        <CardBody>
          <CardTitle tag="h1">Todos</CardTitle>
          <p>Loading todos...</p>
        </CardBody>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card>
        <CardBody>
          <CardTitle tag="h1">Todos</CardTitle>
          <p style={{color: 'red'}}>Error loading todos: {error}</p>
          <p>API URL: {API_URL}</p>
          <Button onClick={getTodos} color="primary">Retry</Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardBody>
          <CardTitle tag="h1">Todos</CardTitle>
          <ListGroup>
            {/* Additional safety check before mapping */}
            {todos && Array.isArray(todos) && todos.length > 0 ? (
              todos.map((todo) => {
                return (
                  <ListGroupItem
                    title="Click this to complete."
                    key={todo._id}
                    action
                    tag="a"
                  >
                    <div className="d-flex w-100 justify-content-between">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          onChange={() => handleClick(todo._id)}
                          value="foobar"
                          defaultChecked={todo.is_complete}
                        />
                      </div>
                      <h5>{todo.title}</h5>
                      <small>Due: {todo.due_date}</small>
                    </div>
                    <p className="mb-1">{todo.description}</p>
                  </ListGroupItem>
                );
              })
            ) : (
              <ListGroupItem>
                <p>No todos found. Add your first todo!</p>
              </ListGroupItem>
            )}
          </ListGroup>
          <Button onClick={() => setModalOpen(true)} color="primary">
            Add Todo
          </Button>
        </CardBody>
      </Card>
      <Modal isOpen={modalOpen}>
        <ModalHeader toggle={() => setModalOpen(!modalOpen)}>
          Add new Todo
        </ModalHeader>
        <ModalBody>
          <TodoForm saveTodo={handleNewTodo} />
        </ModalBody>
      </Modal>
    </>
  );
};

export default Home;

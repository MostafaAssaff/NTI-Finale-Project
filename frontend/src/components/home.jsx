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
} from "reactstrap";
import TodoForm from "./todo-form";

// ✅ USE YOUR BACKEND LOAD BALANCER HERE (or use .env during build)
const API_URL = process.env.REACT_APP_API_URL || 'http://ab88cbab472af4627805c2ff8d125066-1728297530.us-west-2.elb.amazonaws.com:5000/api';

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

      const res = await axios.get(`${API_URL}/todos`);

      if (Array.isArray(res.data)) {
        setTodos(res.data);
      } else if (res.data?.todos && Array.isArray(res.data.todos)) {
        setTodos(res.data.todos);
      } else {
        setTodos([]);
      }
    } catch (err) {
      setError(err.message);
      setTodos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async (id) => {
    try {
      await axios.patch(`${API_URL}/todos/${id}`, { is_complete: true });
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

  if (error) {
    return (
      <Card>
        <CardBody>
          <CardTitle tag="h1">Todos</CardTitle>
          <p style={{ color: 'red' }}>Error loading todos: {error}</p>
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
            {todos.length > 0 ? (
              todos.map((todo) => (
                <ListGroupItem key={todo._id} action tag="a" title="Click this to complete.">
                  <div className="d-flex w-100 justify-content-between">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        onChange={() => handleClick(todo._id)}
                        defaultChecked={todo.is_complete}
                      />
                    </div>
                    <h5>{todo.title}</h5>
                    <small>Due: {todo.due_date}</small>
                  </div>
                  <p className="mb-1">{todo.description}</p>
                </ListGroupItem>
              ))
            ) : (
              <ListGroupItem>
                <p>No todos found. Add your first todo!</p>
              </ListGroupItem>
            )}
          </ListGroup>
          <Button onClick={() => setModalOpen(true)} color="primary">Add Todo</Button>
        </CardBody>
      </Card>

      <Modal isOpen={modalOpen}>
        <ModalHeader toggle={() => setModalOpen(!modalOpen)}>Add new Todo</ModalHeader>
        <ModalBody>
          <TodoForm saveTodo={handleNewTodo} />
        </ModalBody>
      </Modal>
    </>
  );
};

export default Home;

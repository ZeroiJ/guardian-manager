import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginButton from './components/LoginButton';
import Dashboard from './components/Dashboard';
import './index.css';

function Login() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-8">Guardian Nexus</h1>
      <p className="mb-8 text-gray-400">Your ultimate Destiny 2 companion.</p>
      <LoginButton />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;

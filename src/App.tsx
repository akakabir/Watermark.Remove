import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Adder from './pages/Adder';
import History from './pages/History';
import Status from './pages/Status';
import NotFound from './pages/NotFound';

function TopBar() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path ? 'bg-black text-white px-5 py-2.5 rounded-full font-bold shadow-sm' : 'text-gray-500 hover:text-black hover:bg-gray-100 px-5 py-2.5 rounded-full transition-colors';

  return (
    <header className="fixed top-6 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
      <nav className="flex items-center space-x-1 p-1.5 bg-white/80 backdrop-blur-md border border-gray-200 shadow-lg rounded-full pointer-events-auto text-sm font-medium">
        <Link to="/" className={isActive('/')}>Remover</Link>
        <Link to="/adder" className={isActive('/adder')}>Watermark Adder</Link>
        <Link to="/history" className={isActive('/history')}>History</Link>
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <Router>
      <div className="w-full min-h-screen bg-white text-black font-sans flex flex-col overflow-x-hidden pt-28">
        <TopBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/adder" element={<Adder />} />
          <Route path="/history" element={<History />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/status" element={<Status />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}


import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
      <h1 className="text-8xl font-black mb-6 tracking-tight">404</h1>
      <p className="text-xl text-gray-500 mb-10">Oops! The page you're looking for doesn't exist.</p>
      <Link 
        to="/" 
        className="bg-black text-white px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform"
      >
        Go Home
      </Link>
    </main>
  );
}

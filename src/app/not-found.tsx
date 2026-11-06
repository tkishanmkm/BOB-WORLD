import Link from 'next/link';
import React from 'react';

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-100">
      <h1 className="text-4xl font-bold text-gray-800">404</h1>
      <p className="text-xl text-gray-600 mb-4">Page Not Found</p>
      <p className="text-gray-500 mb-8">The page you are looking for does not exist.</p>
      <Link href="/" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
        Go back to Home
      </Link>
    </div>
  );
}
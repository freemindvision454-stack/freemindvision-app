// Production startup script for FreeMind Vision
// This ensures NODE_ENV is properly set before starting the server

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

console.log('=== FreeMind Vision Production Start ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT || '5000');
console.log('=========================================');

// Import and start the server
import('./dist/index.js').catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

const notFoundHandler = (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
};

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: isDevelopment ? err.message : undefined
    });
  }
  
  if (err.name === 'SyntaxError' && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON format' });
  }
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' });
  }
  
  // Generic error response
  res.status(500).json({ 
    error: 'Internal server error',
    details: isDevelopment ? err.message : undefined
  });
};

module.exports = { errorHandler, notFoundHandler };
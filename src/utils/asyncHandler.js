/**
 * Async handler utility to wrap Express route handlers
 * This eliminates the need for try/catch blocks in each route
 * by catching any errors and passing them to the Express error middleware
 * 
 * @param {Function} fn - The async route handler function
 * @returns {Function} - A wrapped function that catches errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch(next);
  };
}

module.exports = asyncHandler;
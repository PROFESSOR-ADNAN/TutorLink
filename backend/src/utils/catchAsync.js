// It's just a function that wraps another function
// and catches any errors, passing them to next()
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = catchAsync;

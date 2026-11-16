import logger from "../utils/logger.js";

export function errorHandler(err, req, res, next) {
  logger.error(err.message || "Unhandled Server Error", {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id || "Guest",
    stack: err.stack,
  });

  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "Internal Server Error" : err.message,
  });
}

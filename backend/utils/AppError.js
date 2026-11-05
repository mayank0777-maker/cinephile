// An error carrying an HTTP status code. Throw it from any controller;
// the central error handler turns it into a JSON response.
export default class AppError extends Error {
  constructor(message, statusCode = 400, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

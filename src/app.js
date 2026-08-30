import express from 'express';
const app = express();
import logger from '#config/logger.js';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from '#routes/auth.routes.js';
import authMiddleware from '#middleware/auth.middleware.js';
import securityMiddleware from '#middleware/security.middleware.js';
app.use(helmet());
app.use(cors());

// JSON parser with error handling for malformed JSON
app.use(express.json({
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf.toString(encoding));
    } catch (e) {
      logger.error('Invalid JSON received', { error: e.message, ip: req.ip });
      throw e;
    }
  }
}));

// URL normalization middleware - remove trailing spaces
app.use((req, res, next) => {
  if (req.url.includes('%20')) {
    req.url = req.url.replace(/%20+$/, '');
  }
  next();
});

app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(cookieParser());

app.get('/', (req, res) => {
  logger.info('Received from Acquisitions API');
  res.status(200).send('Hello from Acquisitions!');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Acquisitions API is running!' });
});

app.use(authMiddleware);
app.use(securityMiddleware);

app.use('/api/auth', authRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// Global error handler with JSON parsing error handling
app.use((err, req, res, next) => {
  // Handle malformed JSON from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.warn('Malformed JSON received from client', { message: err.message, ip: req.ip });
    return res.status(400).json({ message: 'Invalid JSON format' });
  }
  
  // Don't log Arcjet-related errors as critical
  if (err.message && err.message.includes('validate')) {
    logger.warn('Arcjet validation warning', { message: err.message });
    return next();
  }
  
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

export default app;

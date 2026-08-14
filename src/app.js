import express from 'express';
const app = express();
import logger from '#config/logger.js';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(cookieParser());
app.get('/', (req, res) => {
  logger.info('Received from Acquisitions API');
  res.status(200).send('Hello from Acquisitions!');
});

export default app;

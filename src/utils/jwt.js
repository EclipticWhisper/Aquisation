import jwt from 'jsonwebtoken';
import logger from '#config/logger.js';
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.startsWith('replace-with')) {
  throw new Error('JWT_SECRET environment variable must be set to a real secret');
}

const JWT_EXPIRATION = '1d'; // Token expiration time


export const jwttoken = {
  sign: (payload) => {
    try {
      return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
    } catch (error) {
      logger.error('Error signing JWT token:', error);
      throw new Error('Error signing JWT token', { cause: error });
    }
  },
  verify: (token) => {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      logger.error('Error verifying JWT token:', error);
      throw new Error('Error verifying JWT token', { cause: error });
    }
  }
};

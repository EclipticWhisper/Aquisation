import aj from '#config/Arcjet.js';
import logger from '#config/logger.js';
import { slidingWindow } from '@arcjet/node';
const securityMiddleware = async (req, res, next) => {
  try {
    const role = req.user?.role || 'guest'; // Default to 'guest' if no user is authenticated
    let limit;
    let message;
    switch (role) {
      case 'admin':
        limit = 20; // Admins have a higher limit
        message = 'Admin rate limit exceeded';
        break;
      case 'user':
        limit = 10; // Regular users have a lower limit
        message = 'User rate limit exceeded';
        break;
      default:
        limit = 5; // Guests have the lowest limit
        message = 'Guest rate limit exceeded';
    }
    const client = aj.withRule([slidingWindow({ mode: 'LIVE', interval: '1m', max: limit, name: `${role}-rate-limit` })]);
    const decision = await client.protect(req);
    if (decision.isDenied() && decision.reason.isBot()) {
      logger.warn('Bot request blocked', { ip: req.ip, userAgent: req.get('user-agent'), path: req.path });
      return res.status(403).json({ error: message,message: 'Bot request blocked' });
    }
    if (decision.isDenied() && decision.reason.isShield()) {
      logger.warn('Shield request blocked', { ip: req.ip, userAgent: req.get('user-agent'), path: req.path });
      return res.status(403).json({ error: message,message: 'Shield request blocked' });
    }
    if (decision.isDenied() && decision.reason.isRateLimit()) {
      logger.warn('Rate limit request blocked', { ip: req.ip, userAgent: req.get('user-agent'), path: req.path });
      return res.status(403).json({ error: message,message: 'Too many requests' });
    }
    if (decision.isDenied()) {
      logger.warn('Request blocked by Arcjet', { ip: req.ip, userAgent: req.get('user-agent'), path: req.path });
      return res.status(403).json({ message: 'Request blocked' });
    }
    next();
  } catch (e) {
    console.error('Security middleware error:', e);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export default securityMiddleware;
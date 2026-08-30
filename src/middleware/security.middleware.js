import aj, { arcjetMode } from '#config/Arcjet.js';
import logger from '#config/logger.js';
import { slidingWindow } from '@arcjet/node';

const roleClients = {
  admin: aj.withRule(slidingWindow({ mode: arcjetMode, interval: '1m', max: 20, name: 'admin-rate-limit' })),
  user: aj.withRule(slidingWindow({ mode: arcjetMode, interval: '1m', max: 10, name: 'user-rate-limit' })),
  guest: aj.withRule(slidingWindow({ mode: arcjetMode, interval: '1m', max: 5, name: 'guest-rate-limit' })),
};

const roleMessages = {
  admin: 'Admin rate limit exceeded',
  user: 'User rate limit exceeded',
  guest: 'Guest rate limit exceeded',
};

const securityMiddleware = async (req, res, next) => {
  try {
    const role = req.user?.role || 'guest';
    const client = roleClients[role] || roleClients.guest;
    const message = roleMessages[role] || roleMessages.guest;

    const decision = await client.protect(req);
    if (decision.isDenied() && decision.reason.isBot()) {
      logger.warn('Bot request blocked', { ip: req.ip, userAgent: req.get('user-agent'), path: req.path });
      return res.status(403).json({ error: message, message: 'Bot request blocked' });
    }
    if (decision.isDenied() && decision.reason.isShield()) {
      logger.warn('Shield request blocked', { ip: req.ip, userAgent: req.get('user-agent'), path: req.path });
      return res.status(403).json({ error: message, message: 'Shield request blocked' });
    }
    if (decision.isDenied() && decision.reason.isRateLimit()) {
      logger.warn('Rate limit request blocked', { ip: req.ip, userAgent: req.get('user-agent'), path: req.path });
      return res.status(403).json({ error: message, message: 'Too many requests' });
    }
    if (decision.isDenied()) {
      logger.warn('Request blocked by Arcjet', { ip: req.ip, userAgent: req.get('user-agent'), path: req.path });
      return res.status(403).json({ message: 'Request blocked' });
    }
    next();
  } catch (e) {
    logger.error('Security middleware error:', e);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export default securityMiddleware;

import { cookies } from '#utils/cookies.js';
import { jwttoken } from '#utils/jwt.js';

const authMiddleware = (req, res, next) => {
  const token = cookies.get(req, 'token');

  if (token) {
    try {
      req.user = jwttoken.verify(token);
    } catch {
      req.user = undefined;
    }
  }

  next();
};

export default authMiddleware;
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || "ourplace_secret_key";
const USER_CACHE_TTL_MS = 30 * 1000;

export default function createAuthMiddleware(db) {
  const userCache = new Map();

  return async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const cachedUser = userCache.get(decoded.UserID);
      const now = Date.now();
      
      if (cachedUser && cachedUser.expiresAt > now) {
        req.user = cachedUser.user;
        return next();
      }
      
      // Fetch user from database to get HouseholdID
      const user = await db.collection('Users').findOne({ UserID: decoded.UserID });
      
      if (!user) {
        return res.status(401).json({ error: 'User not found.' });
      }
      
      // Add all user info to req.user
      req.user = {
        UserID: user.UserID,
        Email: user.Email,
        HouseholdID: user.HouseholdID
      };

      userCache.set(decoded.UserID, {
        user: req.user,
        expiresAt: now + USER_CACHE_TTL_MS
      });
      
      next();
    } catch (e) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
  };
}

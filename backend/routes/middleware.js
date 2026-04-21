import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || "ourplace_secret_key";
const SLOW_REQUEST_MS = 500;

export default function createAuthMiddleware(db) {
  return async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Fetch user from database to get current HouseholdID.
      const authStart = Date.now();
      const user = await db.collection('Users').findOne({ UserID: decoded.UserID });
      const authMs = Date.now() - authStart;
      
      if (!user) {
        return res.status(401).json({ error: 'User not found.' });
      }
      
      // Add all user info to req.user
      req.user = {
        UserID: user.UserID,
        Email: user.Email,
        HouseholdID: user.HouseholdID
      };

      req.authTimingMs = authMs;

      if (authMs >= SLOW_REQUEST_MS) {
        console.log(`[timing] auth user lookup UserID=${decoded.UserID} path=${req.originalUrl} auth=${authMs}ms`);
      }
      
      next();
    } catch (e) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
  };
}

import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || "ourplace_secret_key";

export default function createAuthMiddleware(db) {
  return async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
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
      
      next();
    } catch (e) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
  };
}
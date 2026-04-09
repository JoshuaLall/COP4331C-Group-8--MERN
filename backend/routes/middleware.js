const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "ourplace_secret_key";

module.exports = function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
};
const jwt = require('jsonwebtoken');
const { secret } = require('../config.json');
const db = require('../_helpers/db');

module.exports = authorize;

function authorize(roles = []) {
    // roles param can be a single role string (e.g. Role.User or 'User') 
    // or an array of roles (e.g. [Role.Admin, Role.User] or ['Admin', 'User'])
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return async (req, res, next) => {
        try {
            // Get token from authorization header
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ message: 'No token provided' });
            }

            // Extract token
            const token = authHeader.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, secret);

            // Get user from database
            const user = await db.Account.findByPk(decoded.id);

            // Check if user still exists
            if (!user) {
                return res.status(401).json({ message: 'User no longer exists' });
            }

            // Check if user has required role
            if (roles.length && !roles.includes(user.role)) {
                return res.status(401).json({ message: 'Unauthorized - Insufficient role privileges' });
            }

            // Authentication and authorization successful
            req.user = user;
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Invalid token' });
        }
    };
}
const roleCheck = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// Specific role checkers
const isNeedy = (req, res, next) => {
  if (req.user.role !== 'needy') {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied. Needy user role required.'
    });
  }
  next();
};

const isVolunteer = (req, res, next) => {
  if (req.user.role !== 'volunteer') {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied. Volunteer role required.'
    });
  }
  next();
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied. Admin role required.'
    });
  }
  next();
};

const isNeedyOrVolunteer = (req, res, next) => {
  if (!['needy', 'volunteer'].includes(req.user.role)) {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied. Needy or volunteer role required.'
    });
  }
  next();
};

module.exports = {
  roleCheck,
  isNeedy,
  isVolunteer,
  isAdmin,
  isNeedyOrVolunteer
};
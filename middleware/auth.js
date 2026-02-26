import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const JWT_SECRET = process.env.JWT_SECRET || 'chapak_waterpark_secret_key_2024'

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

export const auth = asyncHandler(async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '')
  
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' })
  }

  const decoded = jwt.verify(token, JWT_SECRET)
  const user = await User.findById(decoded.userId).select('-password')
  
  if (!user) {
    return res.status(401).json({ message: 'User not found' })
  }

  console.log('Auth success for user:', user.email, 'role:', user.role)
  req.user = user
  next()
})

export const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Access denied. Super Admin only.' })
  }
  next()
}

export const requireAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'super_admin' && req.user.role !== 'admin')) {
    return res.status(403).json({ message: 'Access denied. Admin only.' })
  }
  next()
}

export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

export default { auth, requireSuperAdmin, requireAdmin, generateToken }

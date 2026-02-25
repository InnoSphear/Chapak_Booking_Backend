import express from 'express'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import { generateToken, auth } from '../middleware/auth.js'

const router = express.Router()

const DEFAULT_SUPER_ADMIN = {
  email: 'chapakwaterpark@gmail.com',
  password: 'Chapak@123',
  name: 'Super Admin',
  role: 'super_admin'
}

const ensureSuperAdmin = async () => {
  const existingAdmin = await User.findOne({ email: DEFAULT_SUPER_ADMIN.email })
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(DEFAULT_SUPER_ADMIN.password, 10)
    await User.create({
      ...DEFAULT_SUPER_ADMIN,
      password: hashedPassword
    })
    console.log('Default Super Admin created:', DEFAULT_SUPER_ADMIN.email)
  }
}

ensureSuperAdmin()

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const token = generateToken(user._id)

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isFirstLogin: user.isFirstLogin
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' })
    }

    const user = await User.findById(req.user._id)
    const isMatch = await bcrypt.compare(currentPassword, user.password)
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    user.password = hashedPassword
    user.isFirstLogin = false
    await user.save()

    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.post('/update-email', auth, async (req, res) => {
  try {
    const { newEmail, password } = req.body

    if (!newEmail || !password) {
      return res.status(400).json({ message: 'Please provide new email and password' })
    }

    const user = await User.findById(req.user._id)
    const isMatch = await bcrypt.compare(password, user.password)
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Password is incorrect' })
    }

    const existingUser = await User.findOne({ email: newEmail })
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return res.status(400).json({ message: 'Email already in use' })
    }

    user.email = newEmail
    await user.save()

    res.json({ message: 'Email updated successfully', email: newEmail })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password')
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.get('/users', auth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 })
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.post('/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only Super Admin can create users' })
    }

    const { email, password, name, role } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Please provide email, password and name' })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      role: role || 'admin',
      isFirstLogin: true
    })

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.delete('/users/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only Super Admin can delete users' })
    }

    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' })
    }

    const user = await User.findByIdAndDelete(req.params.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

export default router

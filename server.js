import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

const PORT = process.env.PORT || 5000
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chapak_waterpark'

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB')
    console.log('MongoDB URI:', MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@'))
    initializeDefaultData()
  })
  .catch(err => console.error('MongoDB connection error:', err))

const initializeDefaultData = async () => {
  try {
    const Pricing = (await import('./models/Pricing.js')).default
    
    const defaultPricing = [
      { type: 'weekday', adultPrice: 800, kidsPrice: 500, isActive: true },
      { type: 'saturday', adultPrice: 1000, kidsPrice: 600, isActive: true },
      { type: 'sunday', adultPrice: 1000, kidsPrice: 600, isActive: true },
      { type: 'holiday', adultPrice: 1200, kidsPrice: 700, isActive: true }
    ]
    
    for (const p of defaultPricing) {
      await Pricing.findOneAndUpdate({ type: p.type }, p, { upsert: true, runValidators: false })
    }
    console.log('Default pricing initialized')
  } catch (error) {
    console.error('Error initializing default data:', error.message)
  }
}

import authRoutes from './routes/auth.js'
import bookingRoutes from './routes/bookings.js'
import pricingRoutes from './routes/pricing.js'
import offerRoutes from './routes/offers.js'
import bannerRoutes from './routes/banners.js'
import validationRoutes from './routes/validation.js'
import settingsRoutes from './routes/settings.js'
import cloudinaryRoutes from './routes/cloudinary.js'

app.use('/api/auth', authRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/pricing', pricingRoutes)
app.use('/api/offers', offerRoutes)
app.use('/api/banners', bannerRoutes)
app.use('/api/validation', validationRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/cloudinary', cloudinaryRoutes)

app.get('/api/health', (req, res) => {
  const mongoState = mongoose.connection.readyState
  res.json({ 
    status: 'ok', 
    message: 'Chapak Water Park API is running',
    mongoDB: mongoState === 1 ? 'connected' : 'disconnected'
  })
})
app.get('/api/hello', (req,res)=>{
  res.send('Hello from Chapak Water Park API!')
})

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ message: 'Internal server error', error: err.message })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

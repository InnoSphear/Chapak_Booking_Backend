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
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const PORT = process.env.PORT || 5000
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chapak_waterpark'

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB')
    console.log('MongoDB URI:', MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@')) // Hide credentials
    initializeDefaultData()
  })
  .catch(err => console.error('MongoDB connection error:', err))

const initializeDefaultData = async () => {
  try {
    const Pricing = (await import('./models/Pricing.js')).default
    const Banner = (await import('./models/Banner.js')).default
    
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
    
    const bannerCount = await Banner.countDocuments()
    if (bannerCount === 0) {
      console.log('No banners found, creating defaults...')
      const defaultBanners = [
        {
          title: 'Welcome to Chapak Water Park',
          description: 'Enjoy a splashing good time with your family!',
          imageUrl: 'https://images.unsplash.com/photo-1575424909138-46b05e5919ec?w=1200',
          isActive: true,
          displayOrder: 1
        },
        {
          title: 'Special Weekend Offer',
          description: 'Get 20% off on all tickets this weekend!',
          imageUrl: 'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?w=1200',
          isActive: true,
          displayOrder: 2
        },
        {
          title: 'Kids Day Out',
          description: 'Kids under 12 years enjoy free rides!',
          imageUrl: 'https://images.unsplash.com/photo-1571896349842-68c894913dbb?w=1200',
          isActive: true,
          displayOrder: 3
        }
      ]
      await Banner.insertMany(defaultBanners)
      console.log('Default banners created')
    }
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

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ message: 'Internal server error', error: err.message })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

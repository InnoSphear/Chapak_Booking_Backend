import express from 'express'
import Settings from '../models/Settings.js'
import SpecialDate from '../models/SpecialDate.js'
import { auth, requireSuperAdmin } from '../middleware/auth.js'

const router = express.Router()

const defaultSettings = {
  kidsAgeLimit: { value: 12, description: 'Maximum age for kids ticket' },
  parkName: { value: 'Chapak Water Park', description: 'Water park name' },
  allowOfferStacking: { value: false, description: 'Allow multiple offers to be applied' },
  stripe: { 
    value: { enabled: false, secretKey: '', publishableKey: '' }, 
    description: 'Stripe payment gateway configuration' 
  },
  instamojo: { 
    value: { enabled: false, apiKey: '', authToken: '' }, 
    description: 'Instamojo payment gateway configuration' 
  }
}

const initializeSettings = async () => {
  for (const [key, data] of Object.entries(defaultSettings)) {
    const existing = await Settings.findOne({ key })
    if (!existing) {
      await Settings.create({ key, value: data.value, description: data.description })
    }
  }
}

initializeSettings()

router.get('/', async (req, res) => {
  try {
    const settings = await Settings.find()
    const settingsObj = {}
    settings.forEach(s => {
      settingsObj[s.key] = s.value
    })
    res.json(settingsObj)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.get('/special-dates', async (req, res) => {
  try {
    const specialDates = await SpecialDate.find().sort({ date: 1 })
    res.json(specialDates)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.get('/special-dates/:date', async (req, res) => {
  try {
    const date = new Date(req.params.date)
    date.setHours(0, 0, 0, 0)
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)
    
    const specialDate = await SpecialDate.findOne({
      date: { $gte: date, $lt: nextDate },
      isActive: true
    })
    
    res.json(specialDate || null)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.post('/special-dates', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { date, type, name, priceOverride } = req.body

    if (!date || !type) {
      return res.status(400).json({ message: 'Please provide date and type' })
    }

    const dateObj = new Date(date)
    dateObj.setHours(0, 0, 0, 0)

    let specialDate = await SpecialDate.findOne({ date: dateObj })
    if (specialDate) {
      specialDate.type = type
      specialDate.name = name
      specialDate.priceOverride = priceOverride
      await specialDate.save()
    } else {
      specialDate = await SpecialDate.create({
        date: dateObj,
        type,
        name,
        priceOverride
      })
    }

    res.json(specialDate)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.delete('/special-dates/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const specialDate = await SpecialDate.findByIdAndDelete(req.params.id)
    if (!specialDate) {
      return res.status(404).json({ message: 'Special date not found' })
    }
    res.json({ message: 'Special date deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.get('/:key', async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: req.params.key })
    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' })
    }
    res.json(setting)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.post('/', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { key, value, description } = req.body

    if (!key || value === undefined) {
      return res.status(400).json({ message: 'Please provide key and value' })
    }

    let setting = await Settings.findOne({ key })
    if (setting) {
      setting.value = value
      if (description) setting.description = description
      await setting.save()
    } else {
      setting = await Settings.create({ key, value, description })
    }

    res.json(setting)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

export default router

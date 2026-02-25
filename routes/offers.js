import express from 'express'
import Offer from '../models/Offer.js'
import { auth, requireSuperAdmin } from '../middleware/auth.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const offers = await Offer.find().sort({ priority: -1 })
    res.json(offers)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.get('/active', async (req, res) => {
  try {
    const now = new Date()
    const offers = await Offer.find({
      isActive: true,
      validFrom: { $lte: now },
      validTo: { $gte: now }
    }).sort({ priority: -1 })
    res.json(offers)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' })
    }
    res.json(offer)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.post('/', auth, requireSuperAdmin, async (req, res) => {
  try {
    const {
      name, description, type, value, applicableTo,
      validFrom, validTo, maxUsagePerDay, priority,
      isActive, allowStacking, minTickets, maxDiscount
    } = req.body

    if (!name || !type || !value || !validFrom || !validTo) {
      return res.status(400).json({ message: 'Please provide required fields' })
    }

    const offer = await Offer.create({
      name,
      description,
      type,
      value,
      applicableTo: applicableTo || 'both',
      validFrom: new Date(validFrom),
      validTo: new Date(validTo),
      maxUsagePerDay,
      priority: priority || 0,
      isActive: isActive !== undefined ? isActive : true,
      allowStacking: allowStacking || false,
      minTickets: minTickets || 1,
      maxDiscount
    })

    res.status(201).json(offer)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.put('/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' })
    }

    const updateFields = [
      'name', 'description', 'type', 'value', 'applicableTo',
      'validFrom', 'validTo', 'maxUsagePerDay', 'priority',
      'isActive', 'allowStacking', 'minTickets', 'maxDiscount'
    ]

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'validFrom' || field === 'validTo') {
          offer[field] = new Date(req.body[field])
        } else {
          offer[field] = req.body[field]
        }
      }
    })

    await offer.save()
    res.json(offer)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.delete('/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id)
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' })
    }
    res.json({ message: 'Offer deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.post('/reset-daily-usage', auth, requireSuperAdmin, async (req, res) => {
  try {
    await Offer.updateMany({}, { usedToday: 0 })
    res.json({ message: 'Daily usage reset successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

export default router

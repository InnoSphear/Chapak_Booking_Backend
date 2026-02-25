import express from 'express'
import Banner from '../models/Banner.js'
import { auth, requireSuperAdmin } from '../middleware/auth.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find().sort({ displayOrder: 1 })
    res.json(banners)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.get('/active', async (req, res) => {
  try {
    const now = new Date()
    const banners = await Banner.find({
      isActive: true,
      $or: [
        { startDate: null, endDate: null },
        { startDate: { $lte: now }, endDate: null },
        { startDate: null, endDate: { $gte: now } },
        { startDate: { $lte: now }, endDate: { $gte: now } }
      ]
    }).sort({ displayOrder: 1 })
    res.json(banners)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id)
    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' })
    }
    res.json(banner)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.post('/', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { title, description, imageUrl, imagePublicId, linkUrl, isActive, displayOrder, startDate, endDate } = req.body

    if (!title || !imageUrl) {
      return res.status(400).json({ message: 'Please provide title and imageUrl' })
    }

    const banner = await Banner.create({
      title,
      description,
      imageUrl,
      imagePublicId,
      linkUrl,
      isActive: isActive !== undefined ? isActive : true,
      displayOrder: displayOrder || 0,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    })

    res.status(201).json(banner)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.put('/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id)
    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' })
    }

    const updateFields = ['title', 'description', 'imageUrl', 'imagePublicId', 'linkUrl', 'isActive', 'displayOrder', 'startDate', 'endDate']
    
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'startDate' || field === 'endDate') {
          banner[field] = req.body[field] ? new Date(req.body[field]) : null
        } else {
          banner[field] = req.body[field]
        }
      }
    })

    await banner.save()
    res.json(banner)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.delete('/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id)
    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' })
    }
    res.json({ message: 'Banner deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

export default router

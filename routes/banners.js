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
    console.log('Fetching active banners...')
    const now = new Date()
    console.log('Current time:', now)
    
    const banners = await Banner.find({
      isActive: true,
      $or: [
        { startDate: null, endDate: null },
        { startDate: { $lte: now }, endDate: null },
        { startDate: null, endDate: { $gte: now } },
        { startDate: { $lte: now }, endDate: { $gte: now } }
      ]
    }).sort({ displayOrder: 1 })
    
    console.log('Found banners:', banners.length)
    banners.forEach(b => console.log('Banner:', b.title, 'imageUrl:', b.imageUrl))
    
    res.json(banners)
  } catch (error) {
    console.error('Error fetching active banners:', error)
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
    console.log('=== Banner POST Request ===')
    console.log('User:', req.user?.email, 'Role:', req.user?.role)
    console.log('Request body:', JSON.stringify(req.body))
    
    const { title, description, imageUrl, imagePublicId, linkUrl, isActive, displayOrder, startDate, endDate } = req.body

    if (!title || !imageUrl) {
      console.log('Validation failed: missing title or imageUrl')
      return res.status(400).json({ message: 'Please provide title and imageUrl' })
    }

    // Ensure title and imageUrl are strings
    const safeTitle = String(title).trim()
    const safeImageUrl = String(imageUrl).trim()
    
    if (!safeTitle || !safeImageUrl) {
      console.log('Validation failed: empty title or imageUrl after trim')
      return res.status(400).json({ message: 'Please provide valid title and imageUrl' })
    }

    // Parse isActive properly
    let bannerIsActive = true
    if (isActive !== undefined) {
      if (typeof isActive === 'boolean') {
        bannerIsActive = isActive
      } else if (typeof isActive === 'string') {
        bannerIsActive = isActive.toLowerCase() === 'true'
      }
    }

    // Parse displayOrder
    let bannerDisplayOrder = 0
    if (displayOrder !== undefined) {
      bannerDisplayOrder = parseInt(displayOrder) || 0
    }

    console.log('Creating banner with data:', { 
      title: safeTitle, 
      imageUrl: safeImageUrl, 
      displayOrder: bannerDisplayOrder,
      isActive: bannerIsActive 
    })

    const banner = new Banner({
      title: safeTitle,
      description: description || '',
      imageUrl: safeImageUrl,
      imagePublicId: imagePublicId || '',
      linkUrl: linkUrl || '',
      isActive: bannerIsActive,
      displayOrder: bannerDisplayOrder,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    })
    
    console.log('Saving banner...')
    const savedBanner = await banner.save()
    console.log('Banner saved with _id:', savedBanner._id)
    console.log('Banner imageUrl:', savedBanner.imageUrl)
    
    res.status(201).json(savedBanner)
  } catch (error) {
    console.error('=== Banner Creation Error ===')
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
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

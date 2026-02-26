import express from 'express'
import Banner from '../models/Banner.js'
import { auth, requireSuperAdmin } from '../middleware/auth.js'

const router = express.Router()

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

router.get('/', asyncHandler(async (req, res) => {
  const banners = await Banner.find().sort({ displayOrder: 1 })
  res.json(banners)
}))

router.get('/active', asyncHandler(async (req, res) => {
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
}))

router.get('/:id', asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id)
  if (!banner) {
    return res.status(404).json({ message: 'Banner not found' })
  }
  res.json(banner)
}))

router.post('/', auth, requireSuperAdmin, asyncHandler(async (req, res) => {
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
}))

router.put('/:id', auth, requireSuperAdmin, asyncHandler(async (req, res) => {
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
}))

router.delete('/:id', auth, requireSuperAdmin, asyncHandler(async (req, res) => {
  const banner = await Banner.findByIdAndDelete(req.params.id)
  if (!banner) {
    return res.status(404).json({ message: 'Banner not found' })
  }
  res.json({ message: 'Banner deleted successfully' })
}))

export default router

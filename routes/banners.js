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
}))

router.get('/:id', asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id)
  if (!banner) {
    return res.status(404).json({ message: 'Banner not found' })
  }
  res.json(banner)
}))

router.post('/', auth, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { title, description, imageUrl, imagePublicId, linkUrl, isActive, displayOrder, startDate, endDate } = req.body

  if (!title || !imageUrl) {
    return res.status(400).json({ message: 'Please provide title and imageUrl' })
  }

  const bannerData = {
    title: String(title).trim(),
    description: description || '',
    imageUrl: String(imageUrl).trim(),
    imagePublicId: imagePublicId || '',
    linkUrl: linkUrl || '',
    isActive: isActive === true || isActive === 'true' || isActive === undefined,
    displayOrder: parseInt(displayOrder) || 0,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null
  }

  const savedBanner = await Banner.create(bannerData)
  res.status(201).json(savedBanner)
}))

router.put('/:id', auth, requireSuperAdmin, asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id)
  if (!banner) {
    return res.status(404).json({ message: 'Banner not found' })
  }

  const { title, description, imageUrl, imagePublicId, linkUrl, isActive, displayOrder, startDate, endDate } = req.body

  if (title) banner.title = String(title).trim()
  if (description !== undefined) banner.description = description
  if (imageUrl) banner.imageUrl = String(imageUrl).trim()
  if (imagePublicId !== undefined) banner.imagePublicId = imagePublicId
  if (linkUrl !== undefined) banner.linkUrl = linkUrl
  if (isActive !== undefined) banner.isActive = isActive === true || isActive === 'true'
  if (displayOrder !== undefined) banner.displayOrder = parseInt(displayOrder) || 0
  if (startDate !== undefined) banner.startDate = startDate ? new Date(startDate) : null
  if (endDate !== undefined) banner.endDate = endDate ? new Date(endDate) : null

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

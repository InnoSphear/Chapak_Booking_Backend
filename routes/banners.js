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

router.get('/debug', async (req, res) => {
  try {
    const allBanners = await Banner.find().sort({ displayOrder: 1 })
    res.json({
      total: allBanners.length,
      banners: allBanners.map(b => ({
        _id: b._id,
        title: b.title,
        imageUrl: b.imageUrl,
        isActive: b.isActive,
        displayOrder: b.displayOrder
      }))
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.get('/active', async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ displayOrder: 1 })
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

    const bannerData = {
      title: title.trim(),
      description: description || '',
      imageUrl: imageUrl.trim(),
      imagePublicId: imagePublicId || '',
      linkUrl: linkUrl || '',
      isActive: isActive !== false,
      displayOrder: parseInt(displayOrder) || 0,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    }

    const savedBanner = await Banner.create(bannerData)
    res.status(201).json(savedBanner)
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

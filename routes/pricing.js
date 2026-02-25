import express from 'express'
import Pricing from '../models/Pricing.js'
import { auth, requireSuperAdmin } from '../middleware/auth.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const pricing = await Pricing.find().sort({ type: 1 })
    res.json(pricing)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.get('/:type', async (req, res) => {
  try {
    const pricing = await Pricing.findOne({ type: req.params.type })
    if (!pricing) {
      return res.status(404).json({ message: 'Pricing not found' })
    }
    res.json(pricing)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.post('/', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { type, adultPrice, kidsPrice, isActive } = req.body

    if (!type || adultPrice === undefined || kidsPrice === undefined) {
      return res.status(400).json({ message: 'Please provide type, adultPrice and kidsPrice' })
    }

    const existingPricing = await Pricing.findOne({ type })
    if (existingPricing) {
      existingPricing.adultPrice = adultPrice
      existingPricing.kidsPrice = kidsPrice
      existingPricing.isActive = isActive !== undefined ? isActive : true
      await existingPricing.save()
      return res.json(existingPricing)
    }

    const pricing = await Pricing.create({
      type,
      adultPrice,
      kidsPrice,
      isActive: isActive !== undefined ? isActive : true
    })

    res.status(201).json(pricing)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.put('/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { adultPrice, kidsPrice, isActive } = req.body

    const pricing = await Pricing.findById(req.params.id)
    if (!pricing) {
      return res.status(404).json({ message: 'Pricing not found' })
    }

    if (adultPrice !== undefined) pricing.adultPrice = adultPrice
    if (kidsPrice !== undefined) pricing.kidsPrice = kidsPrice
    if (isActive !== undefined) pricing.isActive = isActive

    await pricing.save()
    res.json(pricing)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.delete('/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const pricing = await Pricing.findByIdAndDelete(req.params.id)
    if (!pricing) {
      return res.status(404).json({ message: 'Pricing not found' })
    }
    res.json({ message: 'Pricing deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

export default router

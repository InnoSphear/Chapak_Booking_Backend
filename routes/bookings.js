import express from 'express'
import Booking from '../models/Booking.js'
import Pricing from '../models/Pricing.js'
import Offer from '../models/Offer.js'
import Settings from '../models/Settings.js'
import SpecialDate from '../models/SpecialDate.js'
import QRCode from 'qrcode'
import { auth, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

const generateBookingId = () => {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `CPK-${dateStr}-${random}`
}

const getPricingForDate = async (visitDate) => {
  const date = new Date(visitDate)
  date.setHours(0, 0, 0, 0)
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + 1)

  const specialDate = await SpecialDate.findOne({
    date: { $gte: date, $lt: nextDate },
    isActive: true
  })

  if (specialDate) {
    if (specialDate.type === 'CLOSED') {
      return { isClosed: true, type: 'CLOSED' }
    }
    if (specialDate.type === 'SPECIAL_PRICE' && specialDate.priceOverride) {
      return {
        isClosed: false,
        type: 'holiday',
        adultPrice: specialDate.priceOverride.adult,
        kidsPrice: specialDate.priceOverride.kids
      }
    }
  }

  const day = date.getDay()
  let pricingType = 'weekday'
  if (day === 6) pricingType = 'saturday'
  else if (day === 0) pricingType = 'sunday'

  let pricing = await Pricing.findOne({ type: pricingType, isActive: true })
  if (!pricing) {
    pricing = await Pricing.findOne({ type: 'weekday', isActive: true })
  }
  
  if (!pricing) {
    return {
      isClosed: false,
      type: pricingType,
      adultPrice: 800,
      kidsPrice: 500
    }
  }

  return {
    isClosed: false,
    type: pricingType,
    adultPrice: pricing.adultPrice,
    kidsPrice: pricing.kidsPrice
  }
}

const calculateBestOffer = async (adults, kids, baseAmount, visitDate) => {
  const now = new Date()
  const offers = await Offer.find({
    isActive: true,
    validFrom: { $lte: now },
    validTo: { $gte: now },
    $or: [
      { maxUsagePerDay: null },
      { maxUsagePerDay: { $gt: 0 } }
    ]
  }).sort({ priority: -1 })

  if (offers.length === 0) return null

  let bestOffer = null
  let maxDiscount = 0

  for (const offer of offers) {
    if (offer.maxUsagePerDay && offer.usedToday >= offer.maxUsagePerDay) continue
    
    const totalTickets = adults + kids
    if (totalTickets < offer.minTickets) continue

    let discount = 0

    switch (offer.type) {
      case 'buy1get1':
        if (adults + kids >= 2) {
          const freeTickets = Math.floor(totalTickets / 2)
          const avgPrice = baseAmount / totalTickets
          discount = avgPrice * freeTickets
        }
        break
      case 'buy2get1':
        if (totalTickets >= 3) {
          const freeTickets = Math.floor(totalTickets / 3)
          const avgPrice = baseAmount / totalTickets
          discount = avgPrice * freeTickets
        }
        break
      case 'buy3get1':
        if (totalTickets >= 4) {
          const freeTickets = Math.floor(totalTickets / 4)
          const avgPrice = baseAmount / totalTickets
          discount = avgPrice * freeTickets
        }
        break
      case 'kids_discount':
        if (kids > 0 && (offer.applicableTo === 'kids' || offer.applicableTo === 'both')) {
          discount = (offer.value / 100) * (kids * (baseAmount / (adults + kids)))
        }
        break
      case 'percentage':
        discount = (offer.value / 100) * baseAmount
        break
      case 'flat':
        discount = offer.value
        break
    }

    if (offer.maxDiscount && discount > offer.maxDiscount) {
      discount = offer.maxDiscount
    }

    if (discount > maxDiscount) {
      maxDiscount = discount
      bestOffer = {
        offerId: offer._id,
        offerName: offer.name,
        discountAmount: discount
      }
    }
  }

  return bestOffer
}

router.get('/pricing/:date', async (req, res) => {
  try {
    const { date } = req.params
    const pricing = await getPricingForDate(date)
    res.json(pricing)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate, search } = req.query
    
    const query = {}
    
    if (status) query.status = status
    if (startDate || endDate) {
      query['payment.status'] = 'PAID'
      query.visitDate = {}
      if (startDate) query.visitDate.$gte = new Date(startDate)
      if (endDate) query.visitDate.$lte = new Date(endDate)
    }
    if (search) {
      query.$or = [
        { bookingId: { $regex: search, $options: 'i' } },
        { 'customer.mobile': { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } }
      ]
    }

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Booking.countDocuments(query)

    res.json({
      bookings,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.id })
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' })
    }
    res.json(booking)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.post('/calculate', async (req, res) => {
  try {
    const { visitDate, adults, kids } = req.body

    if (!visitDate || adults === undefined || kids === undefined) {
      return res.status(400).json({ message: 'Please provide visitDate, adults and kids' })
    }

    if (adults < 0 || kids < 0) {
      return res.status(400).json({ message: 'Number of tickets cannot be negative' })
    }

    if (adults === 0 && kids === 0) {
      return res.status(400).json({ message: 'Please select at least one ticket' })
    }

    const pricing = await getPricingForDate(visitDate)
    
    if (pricing.isClosed) {
      return res.status(400).json({ message: 'Park is closed on this date', isClosed: true })
    }

    const baseAmount = (adults * pricing.adultPrice) + (kids * pricing.kidsPrice)
    const offer = await calculateBestOffer(adults, kids, baseAmount, visitDate)
    const discount = offer ? offer.discountAmount : 0
    const finalAmount = Math.max(0, baseAmount - discount)

    res.json({
      pricing: {
        type: pricing.type,
        adultPrice: pricing.adultPrice,
        kidsPrice: pricing.kidsPrice
      },
      baseAmount,
      discount,
      finalAmount,
      offer: offer ? offer.offerName : null,
      ticketSummary: {
        adults,
        kids,
        total: adults + kids
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { visitDate, adults, kids, customer, paymentGateway } = req.body

    if (!visitDate || adults === undefined || kids === undefined) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    if (adults < 0 || kids < 0) {
      return res.status(400).json({ message: 'Number of tickets cannot be negative' })
    }

    if (adults === 0 && kids === 0) {
      return res.status(400).json({ message: 'Please select at least one ticket' })
    }

    if (!customer || !customer.name || !customer.mobile) {
      return res.status(400).json({ message: 'Please provide customer name and mobile number' })
    }

    const pricing = await getPricingForDate(visitDate)
    
    if (pricing.isClosed) {
      return res.status(400).json({ message: 'Park is closed on this date', isClosed: true })
    }

    const baseAmount = (adults * pricing.adultPrice) + (kids * pricing.kidsPrice)
    const offer = await calculateBestOffer(adults, kids, baseAmount, visitDate)
    const discount = offer ? offer.discountAmount : 0
    const finalAmount = Math.max(0, baseAmount - discount)

    const bookingId = generateBookingId()
    const qrData = JSON.stringify({ bookingId, visitDate, adults, kids })
    const qrCode = await QRCode.toDataURL(qrData)

    const booking = await Booking.create({
      bookingId,
      visitDate: new Date(visitDate),
      customer: {
        name: customer.name,
        email: customer.email,
        mobile: customer.mobile
      },
      tickets: { adult: adults, kids },
      pricing: {
        adultPrice: pricing.adultPrice,
        kidsPrice: pricing.kidsPrice,
        baseAmount,
        discount,
        finalAmount
      },
      payment: {
        gateway: paymentGateway || 'stripe',
        status: 'PENDING'
      },
      status: 'BOOKED',
      verified: false,
      qrCode,
      offerApplied: offer || undefined
    })

    if (offer && offer.offerId) {
      await Offer.findByIdAndUpdate(offer.offerId, { $inc: { usedToday: 1 } })
    }

    res.status(201).json(booking)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.post('/:id/payment-success', async (req, res) => {
  try {
    const { transactionId, paymentId } = req.body
    
    const booking = await Booking.findOne({ bookingId: req.params.id })
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' })
    }

    booking.payment.status = 'PAID'
    booking.payment.transactionId = transactionId
    booking.payment.paymentId = paymentId
    booking.payment.paidAt = new Date()
    await booking.save()

    res.json(booking)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.post('/:id/payment-failed', async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.id })
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' })
    }

    booking.payment.status = 'FAILED'
    await booking.save()

    res.json({ message: 'Payment marked as failed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.get('/stats/dashboard', auth, requireAdmin, async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayBookings = await Booking.find({
      visitDate: { $gte: today, $lt: tomorrow },
      'payment.status': 'PAID'
    })

    const totalTickets = todayBookings.reduce((acc, b) => acc + b.tickets.adult + b.tickets.kids, 0)
    const verifiedTickets = todayBookings.filter(b => b.verified).reduce((acc, b) => acc + b.tickets.adult + b.tickets.kids, 0)
    const todayRevenue = todayBookings.reduce((acc, b) => acc + b.pricing.finalAmount, 0)

    const totalBookings = await Booking.countDocuments({ 'payment.status': 'PAID' })
    const totalRevenue = await Booking.aggregate([
      { $match: { 'payment.status': 'PAID' } },
      { $group: { _id: null, total: { $sum: '$pricing.finalAmount' } } }
    ])

    res.json({
      today: {
        bookings: todayBookings.length,
        tickets: totalTickets,
        verified: verifiedTickets,
        revenue: todayRevenue
      },
      total: {
        bookings: totalBookings,
        revenue: totalRevenue[0]?.total || 0
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

export default router

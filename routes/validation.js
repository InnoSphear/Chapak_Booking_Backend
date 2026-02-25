import express from 'express'
import Booking from '../models/Booking.js'
import { auth } from '../middleware/auth.js'

const router = express.Router()

router.post('/validate', auth, async (req, res) => {
  try {
    const { bookingId, qrData } = req.body

    let booking = null

    if (qrData) {
      try {
        const parsed = JSON.parse(qrData)
        booking = await Booking.findOne({ bookingId: parsed.bookingId })
      } catch (e) {
        booking = await Booking.findOne({ bookingId: qrData })
      }
    } else if (bookingId) {
      booking = await Booking.findOne({ bookingId })
    }

    if (!booking) {
      return res.status(404).json({ 
        valid: false, 
        message: 'Booking not found' 
      })
    }

    if (booking.payment.status !== 'PAID') {
      return res.status(400).json({ 
        valid: false, 
        message: 'Payment not completed',
        booking 
      })
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ 
        valid: false, 
        message: 'Booking has been cancelled',
        booking 
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const bookingDate = new Date(booking.visitDate)
    bookingDate.setHours(0, 0, 0, 0)

    if (bookingDate.getTime() !== today.getTime()) {
      return res.status(400).json({ 
        valid: false, 
        message: `Ticket is for ${booking.visitDate.toISOString().slice(0, 10)}, not today`,
        booking 
      })
    }

    if (booking.verified) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Ticket already validated',
        verifiedAt: booking.verifiedAt,
        booking 
      })
    }

    booking.verified = true
    booking.verifiedAt = new Date()
    booking.verifiedBy = req.user._id
    await booking.save()

    res.json({ 
      valid: true, 
      message: 'Ticket validated successfully',
      booking
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.get('/today', auth, async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const bookings = await Booking.find({
      visitDate: { $gte: today, $lt: tomorrow },
      'payment.status': 'PAID'
    }).sort({ verified: -1, createdAt: -1 })

    const verified = bookings.filter(b => b.verified)
    const pending = bookings.filter(b => !b.verified)

    res.json({
      total: bookings.length,
      verified: verified.length,
      pending: pending.length,
      bookings
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

export default router

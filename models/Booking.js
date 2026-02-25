import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true },
  visitDate: { type: Date, required: true },
  customer: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true }
  },
  tickets: {
    adult: { type: Number, required: true, min: 0 },
    kids: { type: Number, required: true, min: 0 }
  },
  pricing: {
    adultPrice: { type: Number, required: true },
    kidsPrice: { type: Number, required: true },
    baseAmount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true }
  },
  payment: {
    gateway: { type: String, enum: ['stripe', 'instamojo', 'cash'], default: 'stripe' },
    status: { type: String, enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'], default: 'PENDING' },
    transactionId: { type: String },
    paymentId: { type: String },
    paidAt: { type: Date }
  },
  status: { type: String, enum: ['BOOKED', 'CANCELLED', 'EXPIRED'], default: 'BOOKED' },
  verified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  qrCode: { type: String },
  offerApplied: {
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
    offerName: { type: String },
    discountAmount: { type: Number }
  }
}, { timestamps: true })

bookingSchema.index({ 'customer.mobile': 1 })
bookingSchema.index({ visitDate: 1 })
bookingSchema.index({ 'payment.status': 1 })

export default mongoose.model('Booking', bookingSchema)

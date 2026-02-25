import mongoose from 'mongoose'

const offerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  type: { 
    type: String, 
    enum: ['buy1get1', 'buy2get1', 'buy3get1', 'kids_discount', 'percentage', 'flat'], 
    required: true 
  },
  value: { type: Number, required: true },
  applicableTo: { 
    type: String, 
    enum: ['adults', 'kids', 'both'], 
    default: 'both' 
  },
  validFrom: { type: Date, required: true },
  validTo: { type: Date, required: true },
  maxUsagePerDay: { type: Number, default: null },
  usedToday: { type: Number, default: 0 },
  priority: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  allowStacking: { type: Boolean, default: false },
  minTickets: { type: Number, default: 1 },
  maxDiscount: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

offerSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

export default mongoose.model('Offer', offerSchema)

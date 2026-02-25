import mongoose from 'mongoose'

const pricingSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['weekday', 'saturday', 'sunday', 'holiday'], 
    required: true, 
    unique: true 
  },
  adultPrice: { type: Number, required: true, min: 0 },
  kidsPrice: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

pricingSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

export default mongoose.model('Pricing', pricingSchema)

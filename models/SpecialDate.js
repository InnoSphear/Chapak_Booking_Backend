import mongoose from 'mongoose'

const specialDateSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  type: { 
    type: String, 
    enum: ['CLOSED', 'SPECIAL_PRICE'], 
    required: true 
  },
  name: { type: String },
  priceOverride: {
    adult: { type: Number },
    kids: { type: Number }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true })

export default mongoose.model('SpecialDate', specialDateSchema)

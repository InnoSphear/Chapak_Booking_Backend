import mongoose from 'mongoose'

const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  imageUrl: { type: String, required: true },
  imagePublicId: { type: String },
  linkUrl: { type: String },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
  startDate: { type: Date },
  endDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

bannerSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

bannerSchema.index({ displayOrder: 1 })
bannerSchema.index({ isActive: 1 })

export default mongoose.model('Banner', bannerSchema)

import mongoose from 'mongoose'

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: String },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true })

export default mongoose.model('Settings', settingsSchema)

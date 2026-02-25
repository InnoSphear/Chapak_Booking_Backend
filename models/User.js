import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'admin'], default: 'admin' },
  isFirstLogin: { type: Boolean, default: true }
}, { timestamps: true })

export default mongoose.model('User', userSchema)

import express from 'express'
import { auth, requireSuperAdmin } from '../middleware/auth.js'
import { cloudinary } from '../utils/cloudinary.js'
import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'

const router = express.Router()

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'chapak_waterpark',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1920, height: 1080, crop: 'limit' }]
  }
})

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
})

router.post('/upload', auth, requireSuperAdmin, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const imageUrl = req.file.path || `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${req.file.filename}`

    res.json({
      url: imageUrl,
      publicId: req.file.filename || req.file.public_id
    })
  } catch (error) {
    res.status(500).json({ message: 'Upload error', error: error.message })
  }
})

router.delete('/delete/:publicId', auth, requireSuperAdmin, async (req, res) => {
  try {
    const result = await cloudinary.uploader.destroy(req.params.publicId)
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: 'Delete error', error: error.message })
  }
})

export default router

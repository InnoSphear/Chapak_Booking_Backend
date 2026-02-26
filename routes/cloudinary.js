import express from 'express'
import { auth, requireSuperAdmin } from '../middleware/auth.js'
import { cloudinary } from '../utils/cloudinary.js'
import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'

const router = express.Router()

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

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
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
})

router.post('/upload', auth, requireSuperAdmin, upload.single('image'), asyncHandler(async (req, res) => {
  console.log('Upload request received')
  console.log('User:', req.user?.email)
  console.log('File:', req.file)
  
  if (!req.file) {
    console.log('No file in request')
    return res.status(400).json({ message: 'No file uploaded' })
  }

  console.log('Upload successful')
  console.log('File path:', req.file.path)
  console.log('File filename:', req.file.filename)
  console.log('File public_id:', req.file.public_id)

  const imageUrl = req.file.path || `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${req.file.filename}`
  
  console.log('Returning URL:', imageUrl)

  res.json({
    url: imageUrl,
    publicId: req.file.filename || req.file.public_id
  })
}))

router.delete('/delete/:publicId', auth, requireSuperAdmin, asyncHandler(async (req, res) => {
  const result = await cloudinary.uploader.destroy(req.params.publicId)
  res.json(result)
}))

export default router

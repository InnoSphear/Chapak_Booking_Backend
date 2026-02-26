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

const upload = multer({ storage })

router.post('/upload', auth, requireSuperAdmin, upload.single('image'), async (req, res) => {
  try {
    console.log('Upload request received, file:', req.file)
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    console.log('Upload successful, url:', req.file.path)
    res.json({
      url: req.file.path,
      publicId: req.file.filename
    })
  } catch (error) {
    console.error('Upload error:', error)
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

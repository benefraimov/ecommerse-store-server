import path from 'path';
import express from 'express';
import multer from 'multer';

const router = express.Router();

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename(req, file, cb) {
        cb(null, `product-${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// פונקציית בדיקה חדשה ואמינה יותר
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png/;
    // אנחנו בודקים גם את הסיומת וגם את ה-mimetype
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('ניתן להעלות קבצי תמונה בלבד! (jpg, jpeg, png)'), false);
    }
}

const upload = multer({
    storage,
    // השתמשנו בפונקציית fileFilter ששונתה
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
});

router.post('/', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send({ message: 'Please upload a file' });
    }
    res.status(201).send({
        message: 'Image uploaded successfully',
        image: `/${req.file.path.replace(/\\/g, "/")}`,
    });
});

export default router;
import express from "express";
import multer from "multer";
import cors from "cors";
import path from "path";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// Initialize express app
const app = express();
const port = 5003;

// MongoDB Atlas connection string
const dbURI = "mongodb+srv://yashwanthk872:yashu2004@finalyearpro.yd8f7.mongodb.net/?retryWrites=true&w=majority&appName=finalYearPro";

// Configure Cloudinary
try {
    cloudinary.config({
        cloud_name: "digpzlhky",
        api_key: "271776781216447",
        api_secret: "KYR1aKehe9L87zWaC3ulUIQ26xs"
    });
    console.log("Cloudinary configured successfully");
} catch (error) {
    console.error("Error configuring Cloudinary:", error);
    throw error;
}

// MongoDB Connection with better error handling
mongoose.connect(dbURI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000 // 5 seconds timeout for server selection
})
    .then(() => {
        console.log("MongoDB Atlas connected successfully");
        console.log("Database URI:", dbURI.replace(/\/\/[^:]+:[^@]+@/, '//****:****@')); // Log URI without credentials
    })
    .catch((err) => {
        console.error("Error connecting to MongoDB Atlas:", err);
        console.error("Connection error details:", {
            name: err.name,
            message: err.message,
            code: err.code
        });
        process.exit(1); // Exit the process if database connection fails
    });

// Add error handler for MongoDB connection
mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

// MongoDB Schema for File Uploads
const fileUploadSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true },
    phoneCode: { type: String, required: true },
    phone: { type: String, required: true },
    file: {
        filename: { type: String, required: true },
        url: { type: String, required: true },
        size: { type: Number, required: true },
        contentType: { type: String, required: true } // Added to store file type
    },
}, { timestamps: true });

const FileUpload = mongoose.model('FileUpload', fileUploadSchema);

// Enable CORS
app.use(cors({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware to parse incoming request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route to verify server is running
app.get("/", (req, res) => {
    res.json({
        status: "success",
        message: "Backend server is running",
        timestamp: new Date().toISOString()
    });
});

// Get the directory name equivalent for ES modules
const __dirname = path.dirname(new URL(import.meta.url).pathname);

// Set up multer storage for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'finyearpro',
        allowed_formats: ['*'],
        resource_type: 'auto'
    }
});

const upload = multer({ 
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// POST route to handle file upload and form submission
app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        console.log("Upload route hit");
        console.log("Request body:", req.body);
        console.log("Request file:", req.file);
        console.log("Request headers:", req.headers);

        const { username, email, phoneCode, phone } = req.body;

        // Validate required fields
        if (!username || !email || !phoneCode || !phone) {
            console.log("Missing required fields");
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
                receivedFields: { username, email, phoneCode, phone }
            });
        }

        // Check if the file is uploaded
        if (!req.file) {
            console.log("No file uploaded");
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }

        // Validate file size (5MB limit)
        if (req.file.size > 5 * 1024 * 1024) {
            console.log("File too large");
            return res.status(400).json({
                success: false,
                message: "File size exceeds 5MB limit"
            });
        }

        // Prepare file data
        const fileData = {
            filename: req.file.filename,
            url: req.file.path, // Cloudinary URL
            size: req.file.size,
            contentType: req.file.mimetype
        };

        console.log("Prepared file data:", fileData);

        // Create a new document to store in MongoDB
        const newFileUpload = new FileUpload({
            username,
            email,
            phoneCode,
            phone,
            file: fileData,
        });

        // Save the data to MongoDB Atlas
        await newFileUpload.save();
        console.log("Data saved to MongoDB successfully");

        const responseData = {
            success: true,
            message: "File uploaded and data saved successfully to MongoDB Atlas",
            userDetails: { username, email, phoneCode, phone },
            file: req.file,
        };

        console.log("Sending response:", responseData);
        res.status(200).json(responseData);
    } catch (error) {
        console.error("Error in upload route:", error);
        console.error("Error stack:", error.stack);
        console.error("Error details:", {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        
        // Determine the error type and send appropriate response
        let statusCode = 500;
        let errorMessage = "Error processing upload";
        
        if (error.name === 'ValidationError') {
            statusCode = 400;
            errorMessage = "Validation error: " + error.message;
        } else if (error.name === 'MongoError') {
            statusCode = 500;
            errorMessage = "Database error: " + error.message;
        }
        
        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message,
            details: {
                name: error.name,
                code: error.code,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        });
    }
});

// GET route to retrieve all submissions
app.get("/submissions", async (req, res) => {
    try {
        const submissions = await FileUpload.find({})
            .sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            count: submissions.length,
            data: submissions
        });
    } catch (error) {
        console.error("Error fetching submissions:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching submissions",
            error: error.message
        });
    }
});

// GET route to get file URL by filename
app.get("/download/:filename", async (req, res) => {
    try {
        const { filename } = req.params;
        
        const fileRecord = await FileUpload.findOne({ "file.filename": filename });
        
        if (!fileRecord) {
            return res.status(404).json({
                success: false,
                message: "File not found"
            });
        }
        
        res.status(200).json({
            success: true,
            fileUrl: fileRecord.file.url
        });
        
    } catch (error) {
        console.error("Error getting file URL:", error);
        res.status(500).json({
            success: false,
            message: "Error getting file URL",
            error: error.message
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

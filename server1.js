import express from "express";
import multer from "multer";
import cors from "cors";
import path from "path";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

// Load environment variables from .env file if present
dotenv.config();

// Initialize express app
const app = express();
const port = process.env.PORT || 5003;

// Log environment details for debugging
console.log("Node environment:", process.env.NODE_ENV);
console.log("Server starting on port:", port);
console.log("Platform:", process.platform);

// MongoDB Atlas connection string
const dbURI = process.env.MONGODB_URI || "mongodb+srv://yashwanthk872:yashu2004@finalyearpro.yd8f7.mongodb.net/?retryWrites=true&w=majority&appName=finalYearPro";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "digpzlhky",
    api_key: process.env.CLOUDINARY_API_KEY || "271776781216447",
    api_secret: process.env.CLOUDINARY_API_SECRET || "KYR1aKehe9L87zWaC3ulUIQ26xs"
});
console.log("Cloudinary configured");

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
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['https://dataanalyse.netlify.app', 'http://localhost:5173'];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            console.log('Allowed origin:', allowedOrigins);
            console.log('Request origin:', origin);
            return callback(null, true); // Allow all origins for now
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
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

// Set up multer storage for Cloudinary with custom resource type handling
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // Get the resource type based on file extension
        let resourceType = 'auto';
        
        if (file.originalname) {
            if (file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
                resourceType = 'raw';
                console.log("Using raw resource type for Excel file");
            } else if (file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
                resourceType = 'image';
                console.log("Using image resource type for image file");
            } else if (file.originalname.match(/\.(pdf|doc|docx)$/i)) {
                resourceType = 'auto';
                console.log("Using auto resource type for document file");
            }
        }
        
        console.log(`File ${file.originalname} assigned resource type: ${resourceType}`);
        
        return {
            folder: 'finyearpro',
            allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv'],
            resource_type: resourceType
        };
    }
});

// Set up multer for handling file uploads
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // Increase to 10MB limit
    }
});

// POST route to handle file upload and form submission
app.post("/upload", (req, res) => {
    console.log("Upload request received");
    
    // Use multer as middleware within the route
    upload.single("file")(req, res, async function(err) {
        try {
            console.log("Upload route processing");
            console.log("Request body keys:", Object.keys(req.body));
            
            // Check for multer errors
            if (err) {
                console.error("Multer error:", err);
                return res.status(400).json({
                    success: false,
                    message: "File upload error: " + err.message,
                    error: err.message
                });
            }
            
            // Log file details if present
            if (req.file) {
                console.log("Uploaded file details:", {
                    originalname: req.file.originalname,
                    filename: req.file.filename,
                    mimetype: req.file.mimetype,
                    size: req.file.size,
                    path: req.file.path
                });
            } else {
                console.log("No file in request");
            }

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

            // Process the file based on its content type
            let fileUrl = req.file.path;
            
            // Handle Excel files specifically
            if (req.file.mimetype.includes('excel') || 
                req.file.mimetype.includes('spreadsheet') || 
                req.file.originalname.endsWith('.xlsx') || 
                req.file.originalname.endsWith('.xls')) {
                console.log("Processing Excel file");
            }

            // Prepare file data
            const fileData = {
                filename: req.file.filename || req.file.originalname,
                url: fileUrl, // Cloudinary URL
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
                file: {
                    filename: req.file.originalname,
                    url: fileUrl,
                    size: req.file.size,
                    type: req.file.mimetype
                }
            };

            console.log("Sending success response");
            res.status(200).json(responseData);
        } catch (error) {
            console.error("Error in upload route:", error);
            console.error("Error stack:", error.stack);
            
            // Return a clear error response
            res.status(500).json({
                success: false,
                message: "Server error: " + error.message,
                error: error.message
            });
        }
    });
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

// Add a test endpoint for Cloudinary Excel upload
app.get("/test-cloudinary", (req, res) => {
    const samplePdfUrl = "https://res.cloudinary.com/digpzlhky/image/upload/v1742814840/finyearpro/rmcwrn7cs3ui1zulizqi.pdf";
    const sampleExcelUrl = "https://res.cloudinary.com/digpzlhky/raw/upload/v1742814840/finyearpro/sample.xlsx";
    
    res.json({
        message: "Cloudinary URLs for testing",
        pdfUrl: {
            view: samplePdfUrl,
            download: samplePdfUrl.replace("/upload/", "/upload/fl_attachment/")
        },
        excelUrl: {
            view: sampleExcelUrl,
            download: sampleExcelUrl.replace("/upload/", "/upload/fl_attachment/")
        },
        note: "For Excel files, we use raw/upload instead of image/upload in the URL"
    });
});

// Helper function to determine the resource type based on file extension
const getResourceType = (filename) => {
    if (!filename) return 'auto';
    
    const extension = filename.split('.').pop().toLowerCase();
    
    // Use 'raw' for office documents and other raw files
    if (['xlsx', 'xls', 'csv', 'doc', 'docx', 'ppt', 'pptx', 'txt'].includes(extension)) {
        return 'raw';
    }
    
    // Use 'image' for images
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
        return 'image';
    }
    
    // Default to auto for everything else
    return 'auto';
};

// Start the server
app.listen(port, "0.0.0.0", () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Server timestamp: ${new Date().toISOString()}`);
});

// import express from "express";
// import multer from "multer";
// import cors from "cors";
// import path from "path";
// import mongoose from "mongoose";
// import { v2 as cloudinary } from "cloudinary";
// import { CloudinaryStorage } from "multer-storage-cloudinary";
// import dotenv from "dotenv";

// // Load environment variables
// dotenv.config();

// // Initialize express app
// const app = express();
// const port = process.env.PORT || 5003;

// // MongoDB Atlas connection string
// // To set up MongoDB Atlas:
// // 1. Create a free account at https://www.mongodb.com/cloud/atlas
// // 2. Create a new cluster (the free tier is sufficient)
// // 3. Once the cluster is created, click "Connect" and select "Connect your application"
// // 4. Choose Node.js as your driver and copy the connection string
// // 5. Replace <username>, <password>, <cluster-url>, and <database-name> with your actual credentials
// // Example: mongodb+srv://myuser:mypassword@cluster0.mongodb.net/finyearpro?retryWrites=true&w=majority
// const dbURI = process.env.MONGODB_URI; 

// // Configure Cloudinary
// try {
//     cloudinary.config({
//         cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//         api_key: process.env.CLOUDINARY_API_KEY,
//         api_secret: process.env.CLOUDINARY_API_SECRET
//     });
//     console.log("Cloudinary configured successfully");
// } catch (error) {
//     console.error("Error configuring Cloudinary:", error);
//     throw error;
// }

// mongoose.connect(dbURI, { 
//     useNewUrlParser: true, 
//     useUnifiedTopology: true,
//     serverSelectionTimeoutMS: 5000 // 5 seconds timeout for server selection
// })
//     .then(() => console.log("MongoDB Atlas connected successfully"))
//     .catch((err) => console.error("Error connecting to MongoDB Atlas:", err));

// // MongoDB Schema for File Uploads
// const fileUploadSchema = new mongoose.Schema({
//     username: { type: String, required: true },
//     email: { type: String, required: true },
//     phoneCode: { type: String, required: true },
//     phone: { type: String, required: true },
//     file: {
//         filename: { type: String, required: true },
//         url: { type: String, required: true },
//         size: { type: Number, required: true },
//         contentType: { type: String, required: true } // Added to store file type
//     },
// }, { timestamps: true });

// const FileUpload = mongoose.model('FileUpload', fileUploadSchema);

// // Enable CORS
// app.use(cors({
//     origin: '*', // Allow all origins
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization']
// }));

// // Middleware to parse incoming request bodies
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Root route to verify server is running
// app.get("/", (req, res) => {
//     res.json({
//         status: "success",
//         message: "Backend server is running",
//         timestamp: new Date().toISOString()
//     });
// });

// // Get the directory name equivalent for ES modules
// const __dirname = path.dirname(new URL(import.meta.url).pathname);

// // Set up multer storage for Cloudinary
// const storage = new CloudinaryStorage({
//     cloudinary: cloudinary,
//     params: {
//         folder: 'finyearpro',
//         allowed_formats: ['*'],
//         resource_type: 'auto'
//     }
// });

// const upload = multer({ 
//     storage,
//     limits: {
//         fileSize: 5 * 1024 * 1024 // 5MB limit
//     }
// });

// // POST route to handle file upload and form submission
// // POST route to handle file upload and form submission
// app.post("/upload", upload.single("file"), async (req, res) => {
//     try {
//         console.log("Upload route hit");
//         console.log("Request body:", req.body);
//         console.log("Request file:", req.file);
//         console.log("Request headers:", req.headers);

//         const { username, email, phoneCode, phone } = req.body;

//         // Validate required fields
//         if (!username || !email || !phoneCode || !phone) {
//             console.log("Missing required fields");
//             return res.status(400).json({
//                 success: false,
//                 message: "Missing required fields",
//                 receivedFields: { username, email, phoneCode, phone }
//             });
//         }

//         // Check if the file is uploaded
//         if (!req.file) {
//             console.log("No file uploaded");
//             return res.status(400).json({
//                 success: false,
//                 message: "No file uploaded"
//             });
//         }

//         // Validate file size (5MB limit)
//         if (req.file.size > 5 * 1024 * 1024) {
//             console.log("File too large");
//             return res.status(400).json({
//                 success: false,
//                 message: "File size exceeds 5MB limit"
//             });
//         }

//         // Prepare file data
//         const fileData = {
//             filename: req.file.filename,
//             url: req.file.path, // Cloudinary URL
//             size: req.file.size,
//             contentType: req.file.mimetype
//         };

//         console.log("Prepared file data:", fileData);

//         // Create a new document to store in MongoDB
//         const newFileUpload = new FileUpload({
//             username,
//             email,
//             phoneCode,
//             phone,
//             file: fileData,
//         });

//         // Save the data to MongoDB Atlas
//         await newFileUpload.save();
//         console.log("Data saved to MongoDB successfully");

//         const responseData = {
//             success: true,
//             message: "File uploaded and data saved successfully to MongoDB Atlas",
//             userDetails: { username, email, phoneCode, phone },
//             file: req.file,
//         };

//         console.log("Sending response:", responseData);
//         res.status(200).json(responseData);
//     } catch (error) {
//         console.error("Error in upload route:", error);
//         console.error("Error stack:", error.stack);
        
//         // Determine the error type and send appropriate response
//         let statusCode = 500;
//         let errorMessage = "Error processing upload";
        
//         if (error.name === 'ValidationError') {
//             statusCode = 400;
//             errorMessage = "Validation error: " + error.message;
//         } else if (error.name === 'MongoError') {
//             statusCode = 500;
//             errorMessage = "Database error: " + error.message;
//         }
        
//         res.status(statusCode).json({
//             success: false,
//             message: errorMessage,
//             error: error.message,
//             stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
//         });
//     }
// });

// // GET route to retrieve all submissions
// app.get("/submissions", async (req, res) => {
//     try {
//         const submissions = await FileUpload.find({})
//             .sort({ createdAt: -1 });
        
//         res.status(200).json({
//             success: true,
//             count: submissions.length,
//             data: submissions
//         });
//     } catch (error) {
//         console.error("Error fetching submissions:", error);
//         res.status(500).json({
//             success: false,
//             message: "Error fetching submissions",
//             error: error.message
//         });
//     }
// });

// // GET route to get file URL by filename
// app.get("/download/:filename", async (req, res) => {
//     try {
//         const { filename } = req.params;
        
//         const fileRecord = await FileUpload.findOne({ "file.filename": filename });
        
//         if (!fileRecord) {
//             return res.status(404).json({
//                 success: false,
//                 message: "File not found"
//             });
//         }
        
//         res.status(200).json({
//             success: true,
//             fileUrl: fileRecord.file.url
//         });
        
//     } catch (error) {
//         console.error("Error getting file URL:", error);
//         res.status(500).json({
//             success: false,
//             message: "Error getting file URL",
//             error: error.message
//         });
//     }
// });

// // Start the server
// app.listen(port, () => {
//     console.log(`Server running on http://localhost:${port}`);
// });
import express from "express";
import multer from "multer";
import cors from "cors";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5003;

// Validate Environment Variables
const requiredEnvVars = [
    'MONGODB_URI',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
];

requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        throw new Error(`Missing required environment variable: ${varName}`);
    }
});

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Database Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:", err));

mongoose.connection.on("error", err => {
    console.error("MongoDB runtime error:", err);
});

// Schema and Model
const fileUploadSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true },
    phoneCode: { type: String, required: true },
    phone: { type: String, required: true },
    file: {
        filename: String,
        url: String,
        size: Number,
        contentType: String
    }
}, { timestamps: true });

const FileUpload = mongoose.model('FileUpload', fileUploadSchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File Upload Configuration
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'finyearpro',
        allowed_formats: ['*'],
        resource_type: 'auto'
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^(image|application)\//)) {
            return cb(new Error('Only images and documents are allowed'));
        }
        cb(null, true);
    }
});

// Routes
app.get("/", (req, res) => res.json({ 
    status: "running", 
    timestamp: new Date().toISOString() 
}));

app.post("/upload", (req, res) => {
    upload.single("file")(req, res, async (err) => {
        try {
            // Handle upload errors
            if (err) {
                console.error("Upload Error:", err);
                return res.status(400).json({
                    success: false,
                    message: err instanceof multer.MulterError 
                        ? `File upload error: ${err.message}` 
                        : err.message
                });
            }

            // Validate required fields
            const { username, email, phoneCode, phone } = req.body;
            if (!username || !email || !phoneCode || !phone) {
                return res.status(400).json({
                    success: false,
                    message: "All fields are required",
                    received: req.body
                });
            }

            // Validate file upload
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "No file uploaded"
                });
            }

            // Create document
            const newUpload = new FileUpload({
                username,
                email,
                phoneCode,
                phone,
                file: {
                    filename: req.file.filename,
                    url: req.file.path,
                    size: req.file.size,
                    contentType: req.file.mimetype
                }
            });

            // Save to database
            await newUpload.save();

            res.json({
                success: true,
                message: "Data saved successfully",
                data: {
                    username,
                    email,
                    phone: `${phoneCode}${phone}`,
                    fileUrl: req.file.path
                }
            });

        } catch (error) {
            console.error("Server Error:", error);
            res.status(500).json({
                success: false,
                message: error.name === 'ValidationError' 
                    ? `Validation error: ${error.message}`
                    : "Internal server error",
                error: process.env.NODE_ENV === 'development' 
                    ? error.message 
                    : undefined
            });
        }
    });
});

// Start Server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log("Current environment variables:");
    console.log({
        Cloudinary: process.env.CLOUDINARY_CLOUD_NAME ? "Configured" : "Missing",
        MongoDB: process.env.MONGODB_URI ? "Configured" : "Missing"
    });
});
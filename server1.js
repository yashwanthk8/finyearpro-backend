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
// To set up MongoDB Atlas:
// 1. Create a free account at https://www.mongodb.com/cloud/atlas
// 2. Create a new cluster (the free tier is sufficient)
// 3. Once the cluster is created, click "Connect" and select "Connect your application"
// 4. Choose Node.js as your driver and copy the connection string
// 5. Replace <username>, <password>, <cluster-url>, and <database-name> with your actual credentials
// Example: mongodb+srv://myuser:mypassword@cluster0.mongodb.net/finyearpro?retryWrites=true&w=majority
const dbURI = "mongodb+srv://yashwanthk872:yashu2004@finalyearpro.yd8f7.mongodb.net/?retryWrites=true&w=majority&appName=finalYearPro"; 

// Configure Cloudinary
cloudinary.config({
    cloud_name: "digpzlhky",
    api_key: "271776781216447",
    api_secret: "KYR1aKehe9L87zWaC3ulUIQ26xs"
});

mongoose.connect(dbURI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000 // 5 seconds timeout for server selection
})
    .then(() => console.log("MongoDB Atlas connected successfully"))
    .catch((err) => console.error("Error connecting to MongoDB Atlas:", err));

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
app.use(cors());

// Middleware to parse incoming request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

const upload = multer({ storage });

// POST route to handle file upload and form submission
app.post("/upload", upload.single("file"), async (req, res) => {
    const { username, email, phoneCode, phone } = req.body;

    // Check if the file is uploaded
    if (!req.file) {
        return res.status(400).send("No file uploaded");
    }

    // Prepare file data
    const fileData = {
        filename: req.file.filename,
        url: req.file.path, // Cloudinary URL
        size: req.file.size,
        contentType: req.file.mimetype // Save the file type
    };

    // Create a new document to store in MongoDB
    const newFileUpload = new FileUpload({
        username,
        email,
        phoneCode,
        phone,
        file: fileData,
    });

    try {
        // Save the data to MongoDB Atlas
        await newFileUpload.save();

        const responseData = {
            message: "File uploaded and data saved successfully to MongoDB Atlas",
            userDetails: { username, email, phoneCode, phone },
            file: req.file,
        };

        console.log("Received user details:", responseData.userDetails);
        console.log("File details:", responseData.file);

        res.status(200).send(responseData);
    } catch (error) {
        console.error("Error saving to MongoDB Atlas:", error);
        res.status(500).send("Error saving data to database");
    }
});

// GET route to retrieve all submissions
app.get("/submissions", async (req, res) => {
    try {
        // Fetch all documents from FileUpload collection
        const submissions = await FileUpload.find({})
            .select('-file.url') // Exclude file URL for security
            .sort({ createdAt: -1 }); // Sort by creation date, newest first
        
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

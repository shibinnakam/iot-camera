const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// ----------------------------
// MongoDB connection
const uri = process.env.MONGODB_URI || "YOUR_MONGODB_ATLAS_CONNECTION_STRING";
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected!"))
  .catch(err => console.error("MongoDB connection error:", err));

// ----------------------------
// Define Mongoose model
const photoSchema = new mongoose.Schema({
  image: Buffer,         // Store image as binary
  filename: String,
  timestamp: { type: Date, default: Date.now }
});

const Photo = mongoose.model("Photo", photoSchema);

// ----------------------------
// Multer setup for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ----------------------------
// Upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file received" });

    const newPhoto = new Photo({
      image: req.file.buffer,
      filename: `photo_${Date.now()}.jpg`
    });

    await newPhoto.save();
    res.json({ success: true, message: "Photo saved!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error saving photo" });
  }
});

// ----------------------------
// Serve image by ID
app.get("/image/:id", async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    if (!photo) return res.status(404).send("Image not found");

    res.set("Content-Type", "image/jpeg");
    res.send(photo.image);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching image");
  }
});

// ----------------------------
// JSON list of photos
app.get("/photos", async (req, res) => {
  try {
    const photos = await Photo.find().sort({ timestamp: -1 });
    res.json(photos.map(p => ({
      id: p._id,
      filename: p.filename,
      timestamp: p.timestamp
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching photos" });
  }
});

// ----------------------------
// Frontend page
app.get("/", (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>IoT Camera Photos</title>
    <style>
      body { font-family: Arial; margin: 20px; }
      .photo { display: inline-block; margin: 10px; text-align: center; }
      img { width: 250px; height: auto; border: 1px solid #ccc; }
      .timestamp { margin-top: 5px; font-size: 0.9em; color: #555; }
    </style>
  </head>
  <body>
    <h1>IoT Camera Photos</h1>
    <div id="photos"></div>
    <script>
      async function loadPhotos() {
        const res = await fetch("/photos");
        const photos = await res.json();
        const container = document.getElementById("photos");
        container.innerHTML = "";
        photos.forEach(p => {
          const div = document.createElement("div");
          div.className = "photo";
          div.innerHTML = \`
            <img src="/image/\${p.id}" alt="\${p.filename}" />
            <div class="timestamp">\${new Date(p.timestamp).toLocaleString()}</div>
          \`;
          container.appendChild(div);
        });
      }
      loadPhotos();
      setInterval(loadPhotos, 10000); // refresh every 10 sec
    </script>
  </body>
  </html>
  `);
});

// ----------------------------
app.listen(port, () => console.log(`Server running on port ${port}`));

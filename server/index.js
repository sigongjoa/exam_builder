const express = require('express');
const cors = require('cors');
const db = require('./db'); // Initialize DB and create tables

const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors());

// Parse JSON body
app.use(express.json());

// Import Routes
const studentsRoutes = require('./routes/students');
const curriculumRoutes = require('./routes/curriculum');
const problemsRoutes = require('./routes/problems');
const examsRoutes = require('./routes/exams');
const generateRoutes = require('./routes/generate');
const pdfRoutes = require('./routes/pdf');

// Use Routes
app.use('/api/students', studentsRoutes);
app.use('/api/curriculum', curriculumRoutes);
app.use('/api/problems', problemsRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/pdf', pdfRoutes);


// Basic route for testing
app.get('/', (req, res) => {
  res.send('Exam Builder API is running!');
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

const express = require('express');
const cors = require('cors');
const db = require('./db'); // Initialize DB and create tables

const path = require('path');
const app = express();
const port = 3000;

// Serve dataset images directly
app.use('/api/images', express.static(path.join(__dirname, '../dataset')));

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
const aihubRoutes = require('./routes/aihub');
const conceptsRoutes = require('./routes/concepts');
const problemConceptsRoutes = require('./routes/problem-concepts');

// Use Routes
app.use('/api/students', studentsRoutes);
app.use('/api/curriculum', curriculumRoutes);
app.use('/api/problems', problemsRoutes);
app.use('/api/problems', problemConceptsRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/aihub', aihubRoutes);
app.use('/api/concepts', conceptsRoutes);


// Basic route for testing
app.get('/', (req, res) => {
  res.send('Exam Builder API is running!');
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import errorHandler from './middleware/errorHandler.js';
import clientRoutes from './routes/clientRoutes.js';
import followupRoutes from './routes/followupRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import './config/database.js'; // Initializes database tables automatically

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/clients', clientRoutes);
// Follow-ups API endpoint
app.use('/api/followups', followupRoutes);
// Dashboard API endpoint
app.use('/api/dashboard', dashboardRoutes);

// Root test route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Mini Client CRM & Follow-up System API',
    status: 'Running'
  });
});

// Global error handler (should be registered after all routes)
app.use(errorHandler);

export default app;

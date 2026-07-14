import express from 'express';
import { 
  getClients, 
  getClientById, 
  createClient, 
  updateClient, 
  deleteClient 
} from '../controllers/clientController.js';
import { validateClient } from '../middleware/validator.js';

const router = express.Router();

router.route('/')
  .get(getClients)
  .post(validateClient, createClient);

router.route('/:id')
  .get(getClientById)
  .put(validateClient, updateClient)
  .delete(deleteClient);

export default router;

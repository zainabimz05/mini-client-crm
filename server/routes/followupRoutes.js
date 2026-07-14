import express from 'express';
import { 
  getFollowups, 
  getFollowupById, 
  createFollowup, 
  updateFollowup, 
  deleteFollowup 
} from '../controllers/followupController.js';
import { validateFollowup } from '../middleware/validator.js';

const router = express.Router();

router.route('/')
  .get(getFollowups)
  .post(validateFollowup, createFollowup);

router.route('/:id')
  .get(getFollowupById)
  .put(validateFollowup, updateFollowup)
  .delete(deleteFollowup);

export default router;

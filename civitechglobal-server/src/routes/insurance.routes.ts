import { Router } from 'express';
import * as insuranceController from '../controllers/insurance.controller.js';

const router = Router();

router.get('/categories', insuranceController.getCategories);

export default router;

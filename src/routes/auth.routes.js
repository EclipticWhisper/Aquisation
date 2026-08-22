import { signup, signin, signout } from '#controllers/auth.controller.js';
import express from 'express';


const router = express.Router();

// Define your authentication routes here

router.post('/sign-up', signup);


router.post('/sign-in', signin);



router.post('/sign-out', signout);


export default router; 
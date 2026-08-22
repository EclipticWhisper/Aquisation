import { signupSchema, signinSchema } from '#validation/auth.validation.js';
import { formatValidationErrors } from '#utils/format.js';
import logger from '#config/logger.js';
import { authenticateUser, createUser } from '#services/auth.service.js';
import { jwttoken } from "#utils/jwt.js";
import { cookies } from "#utils/cookies.js";

export const signup = async (req, res, next) => {
    try {
        const validationResult = signupSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({ error: 'Validation Failed', details: formatValidationErrors(validationResult.error) });
        }

        const { name, email, password, role } = validationResult.data;

        // auth service
        const user = await createUser({ name, email, password, role });
        
        // FIX: Handle case where createUser catches the error internally and returns undefined
        if (!user) {
            return res.status(409).json({ message: 'User already exists' });
        }

        const token = jwttoken.sign({ id: user.id, email: user.email, role: user.role });

        cookies.set(res, 'token', token);

        logger.info(`User Signed Up Successfully: ${email} with role: ${role}`);
        return res.status(201).json({ message: 'User signed up successfully', user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (e) {
        logger.error('Signup error', e);

        if (e.message === 'User already exists') {
            return res.status(409).json({ message: e.message });
        }
        next(e);
    }
}

export const signin = async (req, res, next) => {
    try {
        const validationResult = signinSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({ error: 'Validation Failed', details: formatValidationErrors(validationResult.error) });
        }

        const { email, password } = validationResult.data;
        const user = await authenticateUser(email, password);
        const token = jwttoken.sign({ id: user.id, email: user.email, role: user.role });

        cookies.set(res, 'token', token);

        logger.info(`User Signed In Successfully: ${email}`);
        return res.status(200).json({ message: 'User signed in successfully', user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (e) {
        logger.error('Signin error', e);

        if (e.message === 'User not found' || e.message === 'Invalid credentials') {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        next(e);
    }
}

export const signout = async (req, res, next) => {
    try {
        cookies.clear(res, 'token');

        logger.info('User Signed Out Successfully');
        return res.status(200).json({ message: 'User signed out successfully' });
    } catch (e) {
        logger.error('Signout error', e);
        next(e);
    }
}

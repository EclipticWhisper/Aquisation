import { signupSchema } from '#validation/auth.validation.js';
import { formatValidationErrors } from '#utils/format.js';
import logger from '#config/logger.js';

export const signup = async (req, res, next) => {
    try {
        const validationResult = signupSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({ error: 'Validation Failed', details: formatValidationErrors(validationResult.error) });
        }

        const { name, email, role } = validationResult.data;

        //auth service

        logger.info(`User Signed Up Successfully: ${email} with role: ${role}`);
        res.status(201).json({ message: 'User signed up successfully', user: { id: 1, name, email, role } });
    } catch (e) {
        logger.error('Signup error', e);

        if (e.message === 'User already exists') {
            return res.status(409).json({ message: e.message });
        }
        next(e);
    }
}
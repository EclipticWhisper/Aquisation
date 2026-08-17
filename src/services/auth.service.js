import logger from '#config/logger.js';
import bcrypt from 'bcrypt';
export const hashPassword = async (password) => {
    try {

        return await bcrypt.hash(password, 10);
    } catch (e) {
        logger.error('Error hashing password:', e);
        throw new Error('Error hashing password');
    }
}

export const createUser = async ({name,email,password,role}) => {
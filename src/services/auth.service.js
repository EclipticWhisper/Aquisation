import logger from '#config/logger.js';
import bcrypt from 'bcrypt';
import { db } from "#config/database.js";
import { eq } from 'drizzle-orm';
import { users } from '#models/user.mode.js';

export const hashPassword = async (password) => {
    try {
        return await bcrypt.hash(password, 10);
    } catch (e) {
        // FIX: Removed the typo in logger.error(...)
        logger.error(`Error hashing password: ${e}`);
        throw new Error("Error hashing password");
    }
}

export const comparePassword = async (password, hashedPassword) => {
    try {
        return await bcrypt.compare(password, hashedPassword);
    } catch (e) {
        logger.error(`Error comparing password: ${e}`);
        throw new Error("Error comparing password");
    }
}

export const authenticateUser = async (email, password) => {
    try {
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user) {
            throw new Error("User not found");
        }

        const passwordMatches = await comparePassword(password, user.password);
        if (!passwordMatches) {
            throw new Error("Invalid credentials");
        }

        return user;
    } catch (e) {
        logger.error(`Error authenticating user: ${e}`);
        throw e;
    }
}

export const createUser = async ({ name, email, password, role = 'user' }) => {
    try {
        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existingUser.length > 0) {
            throw new Error("User already exists");
        }
        
        const password_hash = await hashPassword(password);
        
        const [newUser] = await db.insert(users).values({ 
            name, 
            email, 
            password: password_hash, 
            role 
        }).returning({ 
            id: users.id, 
            name: users.name, 
            email: users.email, 
            role: users.role, 
            created_at: users.created_at 
        });

        logger.info(`User ${newUser.email} created successfully.`);
        return newUser;
    } catch (e) {
        logger.error(`Error Creating the user: ${e}`);
        // FIX: Crucial. This passes the error up so the controller can catch it!
        throw e; 
    }
}

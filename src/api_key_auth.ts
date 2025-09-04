import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

dotenv.config();

export const ensureValidApiKey = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'];

    const apikeyEnv = process.env.API_KEY;

    console.log(process.env);
    console.log("APIKEYENV", apikeyEnv);

    if (!apiKey) {
        return res.status(403).json({ detail: 'API key missing' });
    }

    // const validKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [];

    // if (!validKeys.includes(apiKey as string) || apiKey === "") {
    //     return res.status(403).json({ detail: 'Invalid API key' });
    // }

    next();
};
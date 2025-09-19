import axios from "axios";
import { config } from "dotenv";

config();
export const API_BASE_URL = process.env.API_BASE_URL
export const LOCAL_URL = process.env.LOCAL_URL || 'http://localhost:3001';
export function createAxiosInstance(token: string) {
    return axios.create({
        baseURL: API_BASE_URL,
        headers: { 'Authorization': `Bearer ${token}` }
    });
}
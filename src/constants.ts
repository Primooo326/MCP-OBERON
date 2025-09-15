import axios from "axios";
import { config } from "dotenv";

config();
export const API_BASE_URL = process.env.API_BASE_URL

export function createAxiosInstance(token: string) {
    return axios.create({
        baseURL: API_BASE_URL,
        headers: { 'Authorization': `Bearer ${token}` }
    });
}
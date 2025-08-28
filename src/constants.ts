import 'dotenv/config';
import axios from "axios";
export const API_BASE_URL = "https://api.oberon360.com/api";
const API_AUTH_TOKEN = process.env.OBERON_API_TOKEN;


export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Authorization': `Bearer ${API_AUTH_TOKEN}` }
});

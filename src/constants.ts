import axios from "axios";
export const API_BASE_URL = "https://api.oberon360.com/api";

export function createAxiosInstance(token: string) {
    return axios.create({
        baseURL: API_BASE_URL,
        headers: { 'Authorization': `Bearer ${token}` }
    });
}
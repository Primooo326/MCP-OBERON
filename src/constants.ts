import axios from "axios";
import { config } from "dotenv";
import { execSync } from "child_process";
import fs from "fs";

config();

function resolveBaseUrl(url?: string): string {
    if (!url) {
        return 'http://localhost:3000/api/';
    }
    // Si corre dentro de WSL y la URL apunta a localhost o 127.0.0.1, resolver dinámicamente la IP del host Windows
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
        try {
            if (fs.existsSync('/proc/version')) {
                const procVersion = fs.readFileSync('/proc/version', 'utf8').toLowerCase();
                if (procVersion.includes('microsoft') || procVersion.includes('wsl')) {
                    const defaultRoute = execSync('ip route show default 2>/dev/null', { encoding: 'utf8' });
                    const match = defaultRoute.match(/default via ([0-9.]+)/);
                    if (match && match[1]) {
                        return url.replace('localhost', match[1]).replace('127.0.0.1', match[1]);
                    }
                }
            }
        } catch {
            // fallback a la URL original
        }
    }
    return url;
}

export const API_BASE_URL = resolveBaseUrl(process.env.API_BASE_URL);
export const LOCAL_URL = process.env.LOCAL_URL || 'http://localhost:3001';

export function createAxiosInstance(token: string) {
    return axios.create({
        baseURL: API_BASE_URL,
        headers: { 'Authorization': `Bearer ${token}` }
    });
}
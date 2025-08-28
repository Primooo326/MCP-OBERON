
import axios from 'axios';
import { API_BASE_URL } from './constants.js';
// URL de la API de tu backend real para iniciar sesión
// ¡Asegúrate de poner esto en un archivo .env en un proyecto real!
const AUTH_API_URL = `${API_BASE_URL}/core/auth/login`;

/**
 * Autentica a un usuario contra el backend real.
 * @param username El nombre de usuario.
 * @param password La contraseña.
 * @returns El token JWT si las credenciales son válidas.
 * @throws Si las credenciales son incorrectas o hay un error de red.
 */
export async function authenticateWithBackend(username: string, password: string): Promise<string> {
  try {
    const response = await axios.post(AUTH_API_URL, {
      username,
      password,
    });

    if (response.data && response.data.token) {
      return response.data.token;
    } else {
      throw new Error('La respuesta del backend no contiene un token.');
    }
  } catch (error) {
    console.error('Error al autenticar con el backend:', error);
    // Lanza un error más específico para que el frontend pueda manejarlo
    throw new Error('Credenciales inválidas o error en el servidor de autenticación.');
  }
}

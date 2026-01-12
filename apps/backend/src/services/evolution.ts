import axios from "axios";
import { logger } from "../utils/logger";

// Configuracao da Evolution API (WhatsApp)
const isProduction = process.env.NODE_ENV === "production";
export const EVOLUTION_API_URL =
  process.env.EVOLUTION_API_URL ||
  (isProduction ? "http://evolution-api:8080" : "http://localhost:8080");
// Use a default key only if env var is missing, but warn about it
export const EVOLUTION_API_KEY =
  process.env.EVOLUTION_API_KEY || "B6D711FCDE4D4FD5936544120E713976";
export const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "corretora";

if (!process.env.EVOLUTION_API_KEY) {
  logger.warn(
    "EVOLUTION_API_KEY nao definida. Usando chave padrao de desenvolvimento."
  );
}

// Helper para chamadas a Evolution API
export const evolutionApi = axios.create({
  baseURL: EVOLUTION_API_URL,
  headers: {
    apikey: EVOLUTION_API_KEY,
    "Content-Type": "application/json",
  },
});

// Adicionar interceptor para logar erros da API externa
evolutionApi.interceptors.response.use(
  (response) => response,
  (error) => {
    logger.error("Erro na chamada Evolution API:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);

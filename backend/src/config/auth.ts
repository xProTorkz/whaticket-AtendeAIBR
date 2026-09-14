import { logger } from "../utils/logger";

const isProduction = process.env.NODE_ENV === "production";
const jwtSecret = process.env.JWT_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

const INSECURE_DEFAULT_SECRET = "mysecret";
const INSECURE_DEFAULT_REFRESH = "myanothersecret";

if (isProduction) {
  if (
    !jwtSecret ||
    jwtSecret === INSECURE_DEFAULT_SECRET ||
    jwtSecret.length < 32
  ) {
    throw new Error(
      "FATAL DE SEGURANÇA: JWT_SECRET obrigatório em produção, não pode ser padrão e deve conter no mínimo 32 caracteres."
    );
  }

  if (
    !jwtRefreshSecret ||
    jwtRefreshSecret === INSECURE_DEFAULT_REFRESH ||
    jwtRefreshSecret.length < 32
  ) {
    throw new Error(
      "FATAL DE SEGURANÇA: JWT_REFRESH_SECRET obrigatório em produção, não pode ser padrão e deve conter no mínimo 32 caracteres."
    );
  }
} else if (
  !jwtSecret ||
  jwtSecret === INSECURE_DEFAULT_SECRET ||
  !jwtRefreshSecret ||
  jwtRefreshSecret === INSECURE_DEFAULT_REFRESH
) {
  logger.warn(
    "AVISO DE SEGURANÇA: Usando segredos JWT padrão/inseguros em ambiente de não-produção. Configure JWT_SECRET e JWT_REFRESH_SECRET no seu .env."
  );
}

export default {
  secret: jwtSecret || INSECURE_DEFAULT_SECRET,
  expiresIn: "15m",
  refreshSecret: jwtRefreshSecret || INSECURE_DEFAULT_REFRESH,
  refreshExpiresIn: "7d"
};

import React, { useState, useEffect, useContext } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Paper,
  Button,
  Grid,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Card,
  CardContent,
  Divider,
  CircularProgress
} from "@material-ui/core";
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Speed as SpeedIcon,
  Stars as StarsIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  WhatsApp as WhatsAppIcon,
  ContactPhone as ContactPhoneIcon,
  Send as SendIcon,
  VpnKey as VpnKeyIcon,
  SyncAlt as SyncAltIcon
} from "@material-ui/icons";

import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import MainContainer from "../../components/MainContainer";
import { AuthContext } from "../../context/Auth/AuthContext";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    padding: theme.spacing(2),
  },
  card: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    borderRadius: 8,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  planHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(2),
  },
  bannerTrial: {
    backgroundColor: "#fff3e0",
    color: "#e65100",
    padding: theme.spacing(2),
    borderRadius: 8,
    marginBottom: theme.spacing(3),
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2),
    border: "1px solid #ffe0b2",
  },
  bannerOverlimit: {
    backgroundColor: "#ffebee",
    color: "#c62828",
    padding: theme.spacing(2),
    borderRadius: 8,
    marginBottom: theme.spacing(3),
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2),
    border: "1px solid #ffcdd2",
  },
  progressContainer: {
    marginBottom: theme.spacing(2.5),
  },
  progressLabel: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: theme.spacing(0.5),
    fontSize: "0.875rem",
    fontWeight: 500,
  },
  capabilityItem: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(1, 0),
  },
  priceTag: {
    fontSize: "1.75rem",
    fontWeight: 700,
    color: theme.palette.primary.main,
    marginTop: theme.spacing(1),
  },
}));

const Subscription = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [entitlements, setEntitlements] = useState(null);

  useEffect(() => {
    fetchEntitlements();
  }, []);

  const fetchEntitlements = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/subscription/my-plan");
      setEntitlements(data);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents) => {
    if (!cents) return "Sob Consulta";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const getProgressColor = (percent) => {
    if (percent > 100) return "secondary";
    if (percent >= 80) return "secondary";
    return "primary";
  };

  if (loading) {
    return (
      <MainContainer className={classes.mainContainer}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </MainContainer>
    );
  }

  const { plan, subscription, limits, usage, percentages, capabilities, overLimit, nearLimit } =
    entitlements || {};

  return (
    <MainContainer className={classes.mainContainer}>
      <MainHeader>
        <Title>Meu Plano & Assinatura</Title>
      </MainHeader>

      {/* Trial Countdown Banner */}
      {subscription?.isTrial && (
        <Box className={classes.bannerTrial}>
          <ScheduleIcon style={{ fontSize: 32 }} />
          <Box>
            <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
              Período de Avaliação Gratuita (Trial)
            </Typography>
            <Typography variant="body2">
              {subscription.daysRemainingTrial !== null && subscription.daysRemainingTrial >= 0
                ? `Você está utilizando a avaliação do AtendeAI BR. Restam ${subscription.daysRemainingTrial} dias de teste.`
                : "Seu período de teste encerrou. Mantenha seu plano ativo para continuar operando."}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Overlimit / Downgrade Warning Banner */}
      {overLimit && (
        <Box className={classes.bannerOverlimit}>
          <WarningIcon style={{ fontSize: 32 }} />
          <Box>
            <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
              Limite de Recursos Excedido (Downgrade Seguro)
            </Typography>
            <Typography variant="body2">
              Alguns dos seus recursos excedem o limite contratado no plano atual. Seus dados existentes
              foram preservados com segurança, mas novas criações estão pausadas até ajuste de plano.
            </Typography>
          </Box>
        </Box>
      )}

      <Grid container spacing={3}>
        {/* Card 1: Informações do Plano Atual */}
        <Grid item xs={12} md={4}>
          <Card className={classes.card}>
            <CardContent>
              <Box className={classes.planHeader}>
                <Typography variant="h5" style={{ fontWeight: 700 }}>
                  {plan?.name || "Start"}
                </Typography>
                <Chip
                  label={
                    subscription?.status === "active"
                      ? "Ativo"
                      : subscription?.status === "trial"
                      ? "Trial"
                      : subscription?.status === "trial_expired"
                      ? "Trial Expirado"
                      : subscription?.status === "suspended"
                      ? "Suspenso"
                      : "Pendente"
                  }
                  color={
                    subscription?.status === "active"
                      ? "primary"
                      : subscription?.status === "trial"
                      ? "default"
                      : "secondary"
                  }
                />
              </Box>

              <Typography variant="body2" color="textSecondary">
                {plan?.description || "Plano completo para atendimento e automação comercial"}
              </Typography>

              <Typography className={classes.priceTag}>
                {formatPrice(plan?.price)}
                <Typography component="span" variant="body2" color="textSecondary">
                  {" "}/ mês
                </Typography>
              </Typography>

              <Divider style={{ margin: "20px 0" }} />

              <Typography variant="subtitle2" style={{ fontWeight: 600, marginBottom: 12 }}>
                Recursos Inclusos:
              </Typography>

              <Box className={classes.capabilityItem}>
                {capabilities?.crm ? (
                  <CheckCircleIcon style={{ color: "#2e7d32", fontSize: 20 }} />
                ) : (
                  <CancelIcon style={{ color: "#9e9e9e", fontSize: 20 }} />
                )}
                <Typography variant="body2">CRM & Funil de Vendas</Typography>
              </Box>

              <Box className={classes.capabilityItem}>
                {capabilities?.kanban ? (
                  <CheckCircleIcon style={{ color: "#2e7d32", fontSize: 20 }} />
                ) : (
                  <CancelIcon style={{ color: "#9e9e9e", fontSize: 20 }} />
                )}
                <Typography variant="body2">Gestão Kanban de Atendimentos</Typography>
              </Box>

              <Box className={classes.capabilityItem}>
                {capabilities?.campaigns ? (
                  <CheckCircleIcon style={{ color: "#2e7d32", fontSize: 20 }} />
                ) : (
                  <CancelIcon style={{ color: "#9e9e9e", fontSize: 20 }} />
                )}
                <Typography variant="body2">Disparos em Massa & Campanhas</Typography>
              </Box>

              <Box className={classes.capabilityItem}>
                {capabilities?.schedules ? (
                  <CheckCircleIcon style={{ color: "#2e7d32", fontSize: 20 }} />
                ) : (
                  <CancelIcon style={{ color: "#9e9e9e", fontSize: 20 }} />
                )}
                <Typography variant="body2">Agendamento de Mensagens</Typography>
              </Box>

              <Box className={classes.capabilityItem}>
                {capabilities?.internalChat ? (
                  <CheckCircleIcon style={{ color: "#2e7d32", fontSize: 20 }} />
                ) : (
                  <CancelIcon style={{ color: "#9e9e9e", fontSize: 20 }} />
                )}
                <Typography variant="body2">Chat Interno da Equipe</Typography>
              </Box>

              <Box className={classes.capabilityItem}>
                {capabilities?.apiIntegrations ? (
                  <CheckCircleIcon style={{ color: "#2e7d32", fontSize: 20 }} />
                ) : (
                  <CancelIcon style={{ color: "#9e9e9e", fontSize: 20 }} />
                )}
                <Typography variant="body2">API Pública & Webhooks (n8n)</Typography>
              </Box>

              <Box className={classes.capabilityItem}>
                {capabilities?.customBranding ? (
                  <CheckCircleIcon style={{ color: "#2e7d32", fontSize: 20 }} />
                ) : (
                  <CancelIcon style={{ color: "#9e9e9e", fontSize: 20 }} />
                )}
                <Typography variant="body2">Personalização de Marca & Cores</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 2: Consumo em Tempo Real vs Limites */}
        <Grid item xs={12} md={8}>
          <Card className={classes.card}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" style={{ fontWeight: 600 }}>
                  Consumo Operacional vs Limites Contratados
                </Typography>
                {nearLimit && !overLimit && (
                  <Chip
                    size="small"
                    icon={<WarningIcon />}
                    label="Próximo do Limite (≥80%)"
                    style={{ backgroundColor: "#fff3e0", color: "#e65100" }}
                  />
                )}
                {overLimit && (
                  <Chip
                    size="small"
                    icon={<WarningIcon />}
                    label="Excedente de Limite"
                    color="secondary"
                  />
                )}
              </Box>

              {/* Usuários */}
              <Box className={classes.progressContainer}>
                <Box className={classes.progressLabel}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <PeopleIcon fontSize="small" color="action" />
                    <span>Usuários / Atendentes</span>
                  </Box>
                  <span>
                    {usage?.users} de {limits?.maxUsers} ({percentages?.users}%)
                  </span>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(percentages?.users || 0, 100)}
                  color={getProgressColor(percentages?.users)}
                />
              </Box>

              {/* Conexões WhatsApp */}
              <Box className={classes.progressContainer}>
                <Box className={classes.progressLabel}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <WhatsAppIcon fontSize="small" color="action" />
                    <span>Conexões de WhatsApp</span>
                  </Box>
                  <span>
                    {usage?.connections} de {limits?.maxConnections} ({percentages?.connections}%)
                  </span>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(percentages?.connections || 0, 100)}
                  color={getProgressColor(percentages?.connections)}
                />
              </Box>

              {/* Contatos */}
              <Box className={classes.progressContainer}>
                <Box className={classes.progressLabel}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <ContactPhoneIcon fontSize="small" color="action" />
                    <span>Contatos Cadastrados</span>
                  </Box>
                  <span>
                    {usage?.contacts} de {limits?.maxContacts} ({percentages?.contacts}%)
                  </span>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(percentages?.contacts || 0, 100)}
                  color={getProgressColor(percentages?.contacts)}
                />
              </Box>

              {/* Campanhas */}
              <Box className={classes.progressContainer}>
                <Box className={classes.progressLabel}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <SendIcon fontSize="small" color="action" />
                    <span>Campanhas Ativas</span>
                  </Box>
                  <span>
                    {usage?.campaigns} de {limits?.maxCampaigns} ({percentages?.campaigns}%)
                  </span>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(percentages?.campaigns || 0, 100)}
                  color={getProgressColor(percentages?.campaigns)}
                />
              </Box>

              {/* Agendamentos */}
              <Box className={classes.progressContainer}>
                <Box className={classes.progressLabel}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <ScheduleIcon fontSize="small" color="action" />
                    <span>Agendamentos Pendentes</span>
                  </Box>
                  <span>
                    {usage?.schedules} de {limits?.maxSchedules} ({percentages?.schedules}%)
                  </span>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(percentages?.schedules || 0, 100)}
                  color={getProgressColor(percentages?.schedules)}
                />
              </Box>

              {/* API Keys */}
              <Box className={classes.progressContainer}>
                <Box className={classes.progressLabel}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <VpnKeyIcon fontSize="small" color="action" />
                    <span>Chaves de API</span>
                  </Box>
                  <span>
                    {usage?.apiKeys} de {limits?.maxApiKeys} ({percentages?.apiKeys}%)
                  </span>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(percentages?.apiKeys || 0, 100)}
                  color={getProgressColor(percentages?.apiKeys)}
                />
              </Box>

              {/* Webhooks */}
              <Box className={classes.progressContainer}>
                <Box className={classes.progressLabel}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <SyncAltIcon fontSize="small" color="action" />
                    <span>Webhooks de Integração</span>
                  </Box>
                  <span>
                    {usage?.webhooks} de {limits?.maxWebhooks} ({percentages?.webhooks}%)
                  </span>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(percentages?.webhooks || 0, 100)}
                  color={getProgressColor(percentages?.webhooks)}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </MainContainer>
  );
};

export default Subscription;

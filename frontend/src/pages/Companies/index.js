import React, { useState, useEffect, useContext } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Typography,
  Box,
  CircularProgress,
  Tooltip,
  Grid
} from "@material-ui/core";
import {
  Edit as EditIcon,
  Tune as TuneIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon
} from "@material-ui/icons";
import { toast } from "react-toastify";

import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import MainContainer from "../../components/MainContainer";
import { AuthContext } from "../../context/Auth/AuthContext";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(2),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
    borderRadius: 8,
  },
  alertChip: {
    backgroundColor: "#fff3e0",
    color: "#e65100",
    fontWeight: 600,
  },
  overlimitChip: {
    backgroundColor: "#ffebee",
    color: "#c62828",
    fontWeight: 600,
  },
}));

const Companies = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);

  // Modals state
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const [limitsModalOpen, setLimitsModalOpen] = useState(false);
  const [customLimits, setCustomLimits] = useState({
    maxUsers: "",
    maxConnections: "",
    maxContacts: "",
    maxCampaigns: "",
  });

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState("active");

  useEffect(() => {
    fetchCompanies();
    fetchPlans();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/superadmin/companies");
      setCompanies(data);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const { data } = await api.get("/plans");
      setPlans(data);
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenPlanModal = (company) => {
    setSelectedCompany(company);
    setSelectedPlanId(company.plan?.id || "");
    setPlanModalOpen(true);
  };

  const handleSavePlan = async () => {
    try {
      await api.put(`/superadmin/companies/${selectedCompany.id}/plan`, {
        planId: selectedPlanId,
      });
      toast.success("Plano da empresa atualizado com sucesso!");
      setPlanModalOpen(false);
      fetchCompanies();
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenLimitsModal = (company) => {
    setSelectedCompany(company);
    setCustomLimits({
      maxUsers: company.customLimits?.maxUsers ?? company.limits?.maxUsers ?? "",
      maxConnections: company.customLimits?.maxConnections ?? company.limits?.maxConnections ?? "",
      maxContacts: company.customLimits?.maxContacts ?? company.limits?.maxContacts ?? "",
      maxCampaigns: company.customLimits?.maxCampaigns ?? company.limits?.maxCampaigns ?? "",
    });
    setLimitsModalOpen(true);
  };

  const handleSaveLimits = async () => {
    try {
      const payloadLimits = {
        maxUsers: customLimits.maxUsers !== "" ? Number(customLimits.maxUsers) : undefined,
        maxConnections: customLimits.maxConnections !== "" ? Number(customLimits.maxConnections) : undefined,
        maxContacts: customLimits.maxContacts !== "" ? Number(customLimits.maxContacts) : undefined,
        maxCampaigns: customLimits.maxCampaigns !== "" ? Number(customLimits.maxCampaigns) : undefined,
      };

      await api.put(`/superadmin/companies/${selectedCompany.id}/limits`, {
        customLimits: payloadLimits,
      });
      toast.success("Limites customizados salvos com sucesso!");
      setLimitsModalOpen(false);
      fetchCompanies();
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenStatusModal = (company) => {
    setSelectedCompany(company);
    setSubscriptionStatus(company.subscriptionStatus || "active");
    setStatusModalOpen(true);
  };

  const handleSaveStatus = async () => {
    try {
      const isSuspended = subscriptionStatus === "suspended";
      await api.put(`/superadmin/companies/${selectedCompany.id}/status`, {
        subscriptionStatus,
        status: !isSuspended,
      });
      toast.success("Status do tenant atualizado com sucesso!");
      setStatusModalOpen(false);
      fetchCompanies();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <MainContainer>
      <MainHeader>
        <Title>SuperAdmin SaaS — Gestão de Empresas & Assinaturas</Title>
        <Button
          variant="contained"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={fetchCompanies}
        >
          Atualizar
        </Button>
      </MainHeader>

      <Paper className={classes.mainPaper} variant="outlined">
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Empresa</TableCell>
                <TableCell>Plano</TableCell>
                <TableCell>Status da Assinatura</TableCell>
                <TableCell>Consumo de Usuários</TableCell>
                <TableCell>Consumo de WhatsApp</TableCell>
                <TableCell>Alertas</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>{company.id}</TableCell>
                  <TableCell>
                    <Typography variant="body2" style={{ fontWeight: 600 }}>
                      {company.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={company.plan?.name || "Sem Plano"} color="primary" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={
                        company.subscriptionStatus === "active"
                          ? "Ativo"
                          : company.subscriptionStatus === "trial"
                          ? `Trial (${company.daysRemainingTrial ?? 14}d)`
                          : company.subscriptionStatus === "trial_expired"
                          ? "Trial Expirado"
                          : company.subscriptionStatus === "suspended"
                          ? "Suspenso"
                          : company.subscriptionStatus
                      }
                      color={
                        company.subscriptionStatus === "active"
                          ? "primary"
                          : company.subscriptionStatus === "trial"
                          ? "default"
                          : "secondary"
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {company.usage?.users ?? 0} / {company.limits?.maxUsers ?? 0} (
                    {company.percentages?.users ?? 0}%)
                  </TableCell>
                  <TableCell>
                    {company.usage?.connections ?? 0} / {company.limits?.maxConnections ?? 0} (
                    {company.percentages?.connections ?? 0}%)
                  </TableCell>
                  <TableCell>
                    {company.overLimit && (
                      <Chip
                        size="small"
                        icon={<WarningIcon />}
                        label="Limite Excedido"
                        className={classes.overlimitChip}
                      />
                    )}
                    {company.nearLimit && !company.overLimit && (
                      <Chip
                        size="small"
                        icon={<WarningIcon />}
                        label="≥ 80% Uso"
                        className={classes.alertChip}
                      />
                    )}
                    {!company.nearLimit && !company.overLimit && (
                      <Chip
                        size="small"
                        icon={<CheckCircleIcon />}
                        label="Normal"
                        style={{ backgroundColor: "#e8f5e9", color: "#2e7d32" }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Alterar Plano">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenPlanModal(company)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Limites Customizados (Overrides)">
                      <IconButton
                        size="small"
                        color="default"
                        onClick={() => handleOpenLimitsModal(company)}
                      >
                        <TuneIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Alterar Status / Suspender">
                      <IconButton
                        size="small"
                        color="secondary"
                        onClick={() => handleOpenStatusModal(company)}
                      >
                        {company.subscriptionStatus === "suspended" ? <CheckCircleIcon /> : <BlockIcon />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Modal Alterar Plano */}
      <Dialog open={planModalOpen} onClose={() => setPlanModalOpen(false)}>
        <DialogTitle>Alterar Plano da Empresa: {selectedCompany?.name}</DialogTitle>
        <DialogContent style={{ minWidth: 350 }}>
          <TextField
            select
            label="Novo Plano"
            fullWidth
            variant="outlined"
            margin="normal"
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
          >
            {plans.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name} ({p.maxUsers} usuários, {p.maxConnections} conexões)
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlanModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSavePlan} color="primary" variant="contained">
            Salvar Plano
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Limites Customizados */}
      <Dialog open={limitsModalOpen} onClose={() => setLimitsModalOpen(false)}>
        <DialogTitle>Overrides de Limites: {selectedCompany?.name}</DialogTitle>
        <DialogContent style={{ minWidth: 400 }}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Defina limites customizados específicos para este tenant (substitui os limites do plano).
          </Typography>
          <Grid container spacing={2} style={{ marginTop: 8 }}>
            <Grid item xs={6}>
              <TextField
                label="Máx Usuários"
                type="number"
                variant="outlined"
                fullWidth
                value={customLimits.maxUsers}
                onChange={(e) =>
                  setCustomLimits({ ...customLimits, maxUsers: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Máx Conexões WhatsApp"
                type="number"
                variant="outlined"
                fullWidth
                value={customLimits.maxConnections}
                onChange={(e) =>
                  setCustomLimits({ ...customLimits, maxConnections: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Máx Contatos"
                type="number"
                variant="outlined"
                fullWidth
                value={customLimits.maxContacts}
                onChange={(e) =>
                  setCustomLimits({ ...customLimits, maxContacts: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Máx Campanhas"
                type="number"
                variant="outlined"
                fullWidth
                value={customLimits.maxCampaigns}
                onChange={(e) =>
                  setCustomLimits({ ...customLimits, maxCampaigns: e.target.value })
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLimitsModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveLimits} color="primary" variant="contained">
            Salvar Overrides
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Status / Suspensão */}
      <Dialog open={statusModalOpen} onClose={() => setStatusModalOpen(false)}>
        <DialogTitle>Status do Tenant: {selectedCompany?.name}</DialogTitle>
        <DialogContent style={{ minWidth: 350 }}>
          <TextField
            select
            label="Status da Assinatura"
            fullWidth
            variant="outlined"
            margin="normal"
            value={subscriptionStatus}
            onChange={(e) => setSubscriptionStatus(e.target.value)}
          >
            <MenuItem value="active">Ativo (Regular)</MenuItem>
            <MenuItem value="trial">Em Avaliação (Trial)</MenuItem>
            <MenuItem value="suspended">Suspenso (Bloquear Acesso)</MenuItem>
            <MenuItem value="canceled">Cancelado</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveStatus} color="primary" variant="contained">
            Salvar Status
          </Button>
        </DialogActions>
      </Dialog>
    </MainContainer>
  );
};

export default Companies;

import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Paper,
  Tabs,
  Tab,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Chip,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  Box,
  Tooltip
} from "@material-ui/core";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  History as HistoryIcon,
  FileCopy as CopyIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as PendingIcon
} from "@material-ui/icons";
import { toast } from "react-toastify";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(2),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
  tabPanel: {
    paddingTop: theme.spacing(2),
  },
  secretBox: {
    backgroundColor: "#1e1e24",
    color: "#4ade80",
    padding: theme.spacing(2),
    borderRadius: 4,
    fontFamily: "monospace",
    fontSize: "0.95rem",
    wordBreak: "break-all",
    marginBottom: theme.spacing(2),
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  connectorCard: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  chipSuccess: {
    backgroundColor: "#dcfce7",
    color: "#166534",
    fontWeight: "bold",
  },
  chipFailed: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    fontWeight: "bold",
  },
  chipPending: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
    fontWeight: "bold",
  },
}));

const AVAILABLE_SCOPES = [
  { id: "messages:send", label: "Envio de Mensagens (messages:send)" },
  { id: "contacts:read", label: "Leitura de Contatos (contacts:read)" },
  { id: "contacts:write", label: "Criação/Edição de Contatos (contacts:write)" },
  { id: "tickets:read", label: "Leitura de Tickets (tickets:read)" },
  { id: "tickets:write", label: "Gestão de Tickets (tickets:write)" },
  { id: "crm:read", label: "Leitura de CRM / Funil (crm:read)" },
  { id: "crm:write", label: "Criação/Edição de Deals (crm:write)" },
  { id: "webhooks:write", label: "Webhooks Inbound (webhooks:write)" },
  { id: "*", label: "Acesso Completo Wildcard (*)" },
];

const AVAILABLE_EVENTS = [
  { id: "message.received", label: "Mensagem Recebida" },
  { id: "message.sent", label: "Mensagem Enviada" },
  { id: "contact.created", label: "Contato Criado" },
  { id: "contact.updated", label: "Contato Atualizado" },
  { id: "ticket.created", label: "Ticket Criado" },
  { id: "ticket.closed", label: "Ticket Encerrado" },
  { id: "deal.created", label: "Deal Criado no CRM" },
  { id: "deal.updated", label: "Deal Atualizado" },
  { id: "deal.moved", label: "Deal Movido de Etapa" },
  { id: "tag.added", label: "Tag Adicionada" },
  { id: "tag.removed", label: "Tag Removida" },
  { id: "campaign.started", label: "Campanha Iniciada" },
  { id: "campaign.finished", label: "Campanha Concluída" },
  { id: "schedule.sent", label: "Agendamento Disparado" },
  { id: "schedule.failed", label: "Agendamento Falhou" },
  { id: "*", label: "Todos os Eventos (*)" },
];

const Integrations = () => {
  const classes = useStyles();
  const [activeTab, setActiveTab] = useState(0);

  // API Keys state
  const [apiKeys, setApiKeys] = useState([]);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState(["messages:send", "contacts:read"]);
  const [keyExpiresAt, setKeyExpiresAt] = useState("");
  const [newKeyDisplay, setNewKeyDisplay] = useState(null);

  // Webhooks state
  const [webhooks, setWebhooks] = useState([]);
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [webhookName, setWebhookName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState(["message.received", "ticket.created"]);
  const [newSecretDisplay, setNewSecretDisplay] = useState(null);

  // Deliveries history modal
  const [deliveriesModalOpen, setDeliveriesModalOpen] = useState(false);
  const [selectedWebhookForDeliveries, setSelectedWebhookForDeliveries] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  useEffect(() => {
    fetchApiKeys();
    fetchWebhooks();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const { data } = await api.get("/api-keys");
      setApiKeys(data.apiKeys || []);
    } catch (err) {
      toastError(err);
    }
  };

  const fetchWebhooks = async () => {
    try {
      const { data } = await api.get("/webhooks");
      setWebhooks(data.webhooks || []);
    } catch (err) {
      toastError(err);
    }
  };

  const handleCreateApiKey = async () => {
    if (!keyName.trim()) {
      toast.warning("Informe o nome da chave.");
      return;
    }
    if (selectedScopes.length === 0) {
      toast.warning("Selecione pelo menos um escopo.");
      return;
    }

    try {
      const { data } = await api.post("/api-keys", {
        name: keyName,
        scopes: selectedScopes,
        expiresAt: keyExpiresAt || null,
      });

      setNewKeyDisplay(data.rawKey);
      setKeyModalOpen(false);
      setKeyName("");
      setSelectedScopes(["messages:send", "contacts:read"]);
      setKeyExpiresAt("");
      fetchApiKeys();
      toast.success("Chave de API criada com sucesso!");
    } catch (err) {
      toastError(err);
    }
  };

  const handleRevokeKey = async (id) => {
    try {
      await api.post(`/api-keys/${id}/revoke`);
      toast.success("Chave de API revogada.");
      fetchApiKeys();
    } catch (err) {
      toastError(err);
    }
  };

  const handleRotateKey = async (id) => {
    try {
      const { data } = await api.post(`/api-keys/${id}/rotate`);
      setNewKeyDisplay(data.rawKey);
      fetchApiKeys();
      toast.success("Chave rotacionada com sucesso!");
    } catch (err) {
      toastError(err);
    }
  };

  const handleDeleteKey = async (id) => {
    try {
      await api.delete(`/api-keys/${id}`);
      toast.success("Chave excluída.");
      fetchApiKeys();
    } catch (err) {
      toastError(err);
    }
  };

  const handleCreateWebhook = async () => {
    if (!webhookName.trim() || !webhookUrl.trim()) {
      toast.warning("Informe o nome e a URL do webhook.");
      return;
    }
    if (selectedEvents.length === 0) {
      toast.warning("Selecione pelo menos um evento.");
      return;
    }

    try {
      const { data } = await api.post("/webhooks", {
        name: webhookName,
        url: webhookUrl,
        events: selectedEvents,
      });

      setNewSecretDisplay(data.secret);
      setWebhookModalOpen(false);
      setWebhookName("");
      setWebhookUrl("");
      setSelectedEvents(["message.received", "ticket.created"]);
      fetchWebhooks();
      toast.success("Webhook cadastrado com sucesso!");
    } catch (err) {
      toastError(err);
    }
  };

  const handleDeleteWebhook = async (id) => {
    try {
      await api.delete(`/webhooks/${id}`);
      toast.success("Webhook excluído.");
      fetchWebhooks();
    } catch (err) {
      toastError(err);
    }
  };

  const handlePingWebhook = async (id) => {
    try {
      await api.post(`/webhooks/${id}/ping`);
      toast.info("Evento de teste (ping) enfileirado para envio.");
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenDeliveries = async (webhook) => {
    setSelectedWebhookForDeliveries(webhook);
    setDeliveriesModalOpen(true);
    setDeliveriesLoading(true);

    try {
      const { data } = await api.get("/webhooks/deliveries", {
        params: { webhookId: webhook.id },
      });
      setDeliveries(data.deliveries || []);
    } catch (err) {
      toastError(err);
    } finally {
      setDeliveriesLoading(false);
    }
  };

  const handleRetryDelivery = async (deliveryId) => {
    try {
      await api.post(`/webhooks/deliveries/${deliveryId}/retry`);
      toast.success("Tentativa de reenvio enfileirada.");
      if (selectedWebhookForDeliveries) {
        handleOpenDeliveries(selectedWebhookForDeliveries);
      }
    } catch (err) {
      toastError(err);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  const toggleScope = (scopeId) => {
    if (scopeId === "*") {
      setSelectedScopes(selectedScopes.includes("*") ? [] : ["*"]);
      return;
    }
    const filtered = selectedScopes.filter((s) => s !== "*");
    if (filtered.includes(scopeId)) {
      setSelectedScopes(filtered.filter((s) => s !== scopeId));
    } else {
      setSelectedScopes([...filtered, scopeId]);
    }
  };

  const toggleEvent = (eventId) => {
    if (eventId === "*") {
      setSelectedEvents(selectedEvents.includes("*") ? [] : ["*"]);
      return;
    }
    const filtered = selectedEvents.filter((e) => e !== "*");
    if (filtered.includes(eventId)) {
      setSelectedEvents(filtered.filter((e) => e !== eventId));
    } else {
      setSelectedEvents([...filtered, eventId]);
    }
  };

  return (
    <MainContainer>
      <MainHeader>
        <Title>Integrações & API Pública v1</Title>
      </MainHeader>

      <Paper className={classes.mainPaper}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Chaves de API (API Keys)" />
          <Tab label="Webhooks de Saída" />
          <Tab label="Conectores (n8n, ManyChat, SharkBot)" />
        </Tabs>

        {/* TAB 0: API KEYS */}
        {activeTab === 0 && (
          <div className={classes.tabPanel}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="body1" color="textSecondary">
                Gerencie credenciais oficiais por tenant para acesso à API Pública <code>/api/v1</code>.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setKeyModalOpen(true)}
              >
                Nova Chave de API
              </Button>
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nome da Chave</TableCell>
                  <TableCell>Prefixo</TableCell>
                  <TableCell>Escopos</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Criada em</TableCell>
                  <TableCell>Último Uso</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {apiKeys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      Nenhuma chave de API cadastrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  apiKeys.map((key) => {
                    const isRevoked = Boolean(key.revokedAt);
                    return (
                      <TableRow key={key.id}>
                        <TableCell><strong>{key.name}</strong></TableCell>
                        <TableCell><code>{key.keyPrefix}...****</code></TableCell>
                        <TableCell>
                          {(key.scopes || []).map((scope) => (
                            <Chip
                              key={scope}
                              label={scope}
                              size="small"
                              style={{ marginRight: 4, marginBottom: 2 }}
                            />
                          ))}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={isRevoked ? "Revogada" : "Ativa"}
                            size="small"
                            className={isRevoked ? classes.chipFailed : classes.chipSuccess}
                          />
                        </TableCell>
                        <TableCell>{new Date(key.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          {key.lastUsedAt
                            ? new Date(key.lastUsedAt).toLocaleString("pt-BR")
                            : "Nunca"}
                        </TableCell>
                        <TableCell align="center">
                          {!isRevoked && (
                            <>
                              <Tooltip title="Rotacionar Chave">
                                <IconButton
                                  size="small"
                                  onClick={() => handleRotateKey(key.id)}
                                >
                                  <RefreshIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Revogar Chave">
                                <IconButton
                                  size="small"
                                  color="secondary"
                                  onClick={() => handleRevokeKey(key.id)}
                                >
                                  <BlockIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip title="Excluir">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteKey(key.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* TAB 1: WEBHOOKS */}
        {activeTab === 1 && (
          <div className={classes.tabPanel}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="body1" color="textSecondary">
                Envio assíncrono de eventos de domínio assinados via HMAC-SHA256 (BullMQ/Redis).
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setWebhookModalOpen(true)}
              >
                Novo Webhook
              </Button>
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>URL de Destino</TableCell>
                  <TableCell>Eventos Inscritos</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {webhooks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Nenhum webhook cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  webhooks.map((wh) => (
                    <TableRow key={wh.id}>
                      <TableCell><strong>{wh.name}</strong></TableCell>
                      <TableCell><code>{wh.url}</code></TableCell>
                      <TableCell>
                        {(wh.events || []).map((ev) => (
                          <Chip
                            key={ev}
                            label={ev}
                            size="small"
                            style={{ marginRight: 4, marginBottom: 2 }}
                          />
                        ))}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={wh.isActive ? "Ativo" : "Inativo"}
                          size="small"
                          className={wh.isActive ? classes.chipSuccess : classes.chipFailed}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Histórico de Entregas">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDeliveries(wh)}
                          >
                            <HistoryIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Enviar Teste (Ping)">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handlePingWebhook(wh.id)}
                          >
                            <SendIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteWebhook(wh.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* TAB 2: CONECTORES */}
        {activeTab === 2 && (
          <div className={classes.tabPanel}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card className={classes.connectorCard} variant="outlined">
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="h6">n8n Workflow</Typography>
                      <Chip label="Disponível & Homologado" size="small" className={classes.chipSuccess} />
                    </Box>
                    <Typography variant="body2" color="textSecondary" paragraph>
                      Integração bidirecional completa sem acoplamento de código.
                    </Typography>
                    <Typography variant="caption" component="div">
                      • Receba webhooks com validação <code>X-Webhook-Signature</code>.<br />
                      • Faça chamadas a <code>/api/v1/messages/send</code>, <code>/contacts</code>, <code>/tickets</code> e <code>/crm/deals</code>.<br />
                      • Suporte a <code>Idempotency-Key</code> para resiliência de rede.
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      color="primary"
                      onClick={() => setActiveTab(0)}
                    >
                      Gerar Chave para n8n
                    </Button>
                  </CardActions>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card className={classes.connectorCard} variant="outlined">
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="h6">ManyChat</Typography>
                      <Chip label="API Oficial Swagger" size="small" className={classes.chipSuccess} />
                    </Box>
                    <Typography variant="body2" color="textSecondary" paragraph>
                      Baseado estritamente na documentação Swagger oficial da ManyChat.
                    </Typography>
                    <Typography variant="caption" component="div">
                      • Criação e busca de subscribers por telefone.<br />
                      • Atualização de Custom Fields.<br />
                      • Disparo de flows e conteúdos de mensagem.<br />
                      <em>Nota: Envio condicionado à existência de subscriber na ManyChat.</em>
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      color="primary"
                      onClick={() => setActiveTab(1)}
                    >
                      Configurar Webhook
                    </Button>
                  </CardActions>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card className={classes.connectorCard} variant="outlined">
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="h6">SharkBot</Typography>
                      <Chip label="Contrato ISharkBotAdapter" size="small" className={classes.chipPending} />
                    </Box>
                    <Typography variant="body2" color="textSecondary" paragraph>
                      Contrato de integração preparado sem engenharia reversa.
                    </Typography>
                    <Typography variant="caption" component="div">
                      <strong>Status de Ativação:</strong> Aguardando fornecimento de:<br />
                      1. Endpoint oficial de produção;<br />
                      2. Esquema de autenticação;<br />
                      3. Formato da assinatura de webhook.
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small" disabled>
                      Pendente Homologação Fornecedor
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            </Grid>
          </div>
        )}
      </Paper>

      {/* MODAL CRIAR CHAVE */}
      <Dialog open={keyModalOpen} onClose={() => setKeyModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nova Chave de API</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome da Integração (ex: n8n Produção)"
            fullWidth
            margin="normal"
            variant="outlined"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
          />
          <TextField
            label="Data de Expiração (Opcional)"
            type="date"
            fullWidth
            margin="normal"
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            value={keyExpiresAt}
            onChange={(e) => setKeyExpiresAt(e.target.value)}
          />
          <Typography variant="subtitle2" style={{ marginTop: 16 }}>
            Escopos de Acesso Permitidos:
          </Typography>
          <Grid container>
            {AVAILABLE_SCOPES.map((sc) => (
              <Grid item xs={12} sm={6} key={sc.id}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedScopes.includes(sc.id) || selectedScopes.includes("*")}
                      onChange={() => toggleScope(sc.id)}
                      color="primary"
                    />
                  }
                  label={<Typography variant="body2">{sc.label}</Typography>}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKeyModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreateApiKey} color="primary" variant="contained">
            Gerar Chave
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL EXIBIÇÃO ÚNICA DA CHAVE DE API */}
      <Dialog open={Boolean(newKeyDisplay)} onClose={() => setNewKeyDisplay(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Chave de API Gerada com Sucesso</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="error" gutterBottom>
            <strong>ATENÇÃO:</strong> Copie sua chave de API agora. Por motivos de segurança, ela <strong>NUNCA</strong> será exibida novamente.
          </Typography>
          <div className={classes.secretBox}>
            <span>{newKeyDisplay}</span>
            <IconButton
              size="small"
              style={{ color: "#4ade80" }}
              onClick={() => copyToClipboard(newKeyDisplay)}
            >
              <CopyIcon fontSize="small" />
            </IconButton>
          </div>
          <Typography variant="caption" color="textSecondary">
            Use esta chave no cabeçalho: <code>Authorization: Bearer {newKeyDisplay?.slice(0, 16)}...</code>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => copyToClipboard(newKeyDisplay)} color="primary" variant="outlined">
            Copiar Chave
          </Button>
          <Button onClick={() => setNewKeyDisplay(null)} color="primary" variant="contained">
            Entendido, já guardei
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL CRIAR WEBHOOK */}
      <Dialog open={webhookModalOpen} onClose={() => setWebhookModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Novo Webhook de Saída</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome do Webhook"
            fullWidth
            margin="normal"
            variant="outlined"
            value={webhookName}
            onChange={(e) => setWebhookName(e.target.value)}
          />
          <TextField
            label="URL de Destino (Endpoint HTTPS)"
            fullWidth
            margin="normal"
            variant="outlined"
            placeholder="https://n8n.suaempresa.com.br/webhook/..."
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
          <Typography variant="subtitle2" style={{ marginTop: 16 }}>
            Eventos Subscritos:
          </Typography>
          <Grid container>
            {AVAILABLE_EVENTS.map((ev) => (
              <Grid item xs={12} sm={6} key={ev.id}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedEvents.includes(ev.id) || selectedEvents.includes("*")}
                      onChange={() => toggleEvent(ev.id)}
                      color="primary"
                    />
                  }
                  label={<Typography variant="body2">{ev.label}</Typography>}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWebhookModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreateWebhook} color="primary" variant="contained">
            Cadastrar Webhook
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL EXIBIÇÃO ÚNICA DO SECRET DO WEBHOOK */}
      <Dialog open={Boolean(newSecretDisplay)} onClose={() => setNewSecretDisplay(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Webhook Cadastrado com Sucesso</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="error" gutterBottom>
            <strong>Secret de Assinatura HMAC-SHA256:</strong> Guarde este segredo para validar os cabeçalhos <code>X-Webhook-Signature</code>.
          </Typography>
          <div className={classes.secretBox}>
            <span>{newSecretDisplay}</span>
            <IconButton
              size="small"
              style={{ color: "#4ade80" }}
              onClick={() => copyToClipboard(newSecretDisplay)}
            >
              <CopyIcon fontSize="small" />
            </IconButton>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => copyToClipboard(newSecretDisplay)} color="primary" variant="outlined">
            Copiar Secret
          </Button>
          <Button onClick={() => setNewSecretDisplay(null)} color="primary" variant="contained">
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL HISTÓRICO DE ENTREGAS */}
      <Dialog
        open={deliveriesModalOpen}
        onClose={() => setDeliveriesModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Histórico de Entregas — {selectedWebhookForDeliveries?.name}
        </DialogTitle>
        <DialogContent>
          {deliveriesLoading ? (
            <Typography>Carregando histórico...</Typography>
          ) : deliveries.length === 0 ? (
            <Typography color="textSecondary">Nenhuma entrega registrada para este webhook.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Evento</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Tentativas</TableCell>
                  <TableCell>Código HTTP</TableCell>
                  <TableCell>Data/Hora</TableCell>
                  <TableCell>Erro / Resposta</TableCell>
                  <TableCell align="center">Ação</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deliveries.map((del) => {
                  const isSuccess = del.status === "SUCCESS";
                  const isFailed = del.status === "FAILED";
                  return (
                    <TableRow key={del.id}>
                      <TableCell><code>{del.event}</code></TableCell>
                      <TableCell>
                        <Chip
                          label={del.status}
                          size="small"
                          className={
                            isSuccess
                              ? classes.chipSuccess
                              : isFailed
                              ? classes.chipFailed
                              : classes.chipPending
                          }
                        />
                      </TableCell>
                      <TableCell>{del.attempts}/5</TableCell>
                      <TableCell>{del.lastResponseStatus || "-"}</TableCell>
                      <TableCell>{new Date(del.createdAt).toLocaleString("pt-BR")}</TableCell>
                      <TableCell>
                        <Typography variant="caption" style={{ maxWidth: 200, display: "block" }}>
                          {del.lastError || del.lastResponseBody || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {isFailed && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleRetryDelivery(del.id)}
                          >
                            Reenviar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeliveriesModalOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </MainContainer>
  );
};

export default Integrations;

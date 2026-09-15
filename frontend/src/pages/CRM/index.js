import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Paper,
  Tabs,
  Tab,
  Typography,
  Button,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  Card,
  CardContent,
  InputAdornment,
  MenuItem
} from "@material-ui/core";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  WhatsApp as WhatsAppIcon,
  Person as PersonIcon,
  Receipt as ReceiptIcon,
  Autorenew as AutorenewIcon,
  Cake as CakeIcon,
  DirectionsCar as CarIcon,
  AttachMoney as MoneyIcon,
  Settings as SettingsIcon
} from "@material-ui/icons";
import { toast } from "react-toastify";
import {
  getCrmClientes,
  saveCrmCliente,
  deleteCrmCliente,
  getCrmOrdens,
  saveCrmOrdem,
  deleteCrmOrdem,
  getCrmConfig,
  saveCrmConfig,
  getClientesSumidos,
  getClientesAniversariantes
} from "../../services/crmStorage";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
    backgroundColor: theme.palette.background.default,
    minHeight: "100vh"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(3)
  },
  title: {
    fontWeight: 700,
    color: theme.palette.text.primary
  },
  tabPaper: {
    marginBottom: theme.spacing(3)
  },
  searchPaper: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(2)
  },
  actionButton: {
    borderRadius: 8,
    textTransform: "none",
    fontWeight: 600
  },
  statCard: {
    padding: theme.spacing(2),
    borderRadius: 12,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2)
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff"
  },
  tablePaper: {
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
  },
  chipStatus: {
    fontWeight: 600,
    borderRadius: 6
  }
}));

const emptyCliente = {
  nome: "",
  telefone: "",
  email: "",
  dataNascimento: "",
  veiculo: "",
  placa: "",
  ultimoServico: new Date().toISOString().split("T")[0],
  status: "ativo",
  notas: ""
};

const emptyOrdem = {
  clienteId: "",
  clienteNome: "",
  descricao: "",
  valor: 0,
  status: "aberto"
};

export default function CRM() {
  const classes = useStyles();
  const [activeTab, setActiveTab] = useState(0);

  // Clientes
  const [clientes, setClientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [clienteModalOpen, setClienteModalOpen] = useState(false);
  const [clienteFormData, setClienteFormData] = useState(emptyCliente);

  // Ordens / Negócios
  const [ordens, setOrdens] = useState([]);
  const [ordemModalOpen, setOrdemModalOpen] = useState(false);
  const [ordemFormData, setOrdemFormData] = useState(emptyOrdem);

  // Automação & Retenção
  const [config, setConfig] = useState(getCrmConfig());
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configFormData, setConfigFormData] = useState(config);
  const [clientesSumidos, setClientesSumidos] = useState([]);
  const [aniversariantes, setAniversariantes] = useState([]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = () => {
    const clis = getCrmClientes();
    const ords = getCrmOrdens();
    const cfg = getCrmConfig();
    setClientes(clis);
    setOrdens(ords);
    setConfig(cfg);
    setConfigFormData(cfg);
    setClientesSumidos(getClientesSumidos(cfg.diasClienteSumido));
    setAniversariantes(getClientesAniversariantes());
  };

  // Clientes Handlers
  const handleOpenClienteModal = (cliente = null) => {
    if (cliente) {
      setClienteFormData(cliente);
    } else {
      setClienteFormData(emptyCliente);
    }
    setClienteModalOpen(true);
  };

  const handleSaveCliente = () => {
    if (!clienteFormData.nome || !clienteFormData.telefone) {
      toast.error("Nome e Telefone são obrigatórios!");
      return;
    }
    saveCrmCliente(clienteFormData);
    toast.success("Cliente salvo com sucesso!");
    setClienteModalOpen(false);
    loadAllData();
  };

  const handleDeleteCliente = (id) => {
    if (window.confirm("Deseja realmente excluir este cliente do CRM?")) {
      deleteCrmCliente(id);
      toast.success("Cliente removido!");
      loadAllData();
    }
  };

  // Ordens Handlers
  const handleOpenOrdemModal = (ordem = null) => {
    if (ordem) {
      setOrdemFormData(ordem);
    } else {
      setOrdemFormData({
        ...emptyOrdem,
        clienteId: clientes[0]?.id || "",
        clienteNome: clientes[0]?.nome || ""
      });
    }
    setOrdemModalOpen(true);
  };

  const handleSaveOrdem = () => {
    if (!ordemFormData.descricao || !ordemFormData.clienteId) {
      toast.error("Preencha cliente e descrição da ordem!");
      return;
    }
    saveCrmOrdem({
      ...ordemFormData,
      valor: parseFloat(ordemFormData.valor) || 0
    });
    toast.success("Ordem de serviço salva!");
    setOrdemModalOpen(false);
    loadAllData();
  };

  const handleDeleteOrdem = (id) => {
    if (window.confirm("Deseja excluir esta ordem de serviço?")) {
      deleteCrmOrdem(id);
      toast.success("Ordem removida!");
      loadAllData();
    }
  };

  // Config Handlers
  const handleSaveConfig = () => {
    saveCrmConfig(configFormData);
    toast.success("Regras de retenção atualizadas!");
    setConfigModalOpen(false);
    loadAllData();
  };

  // Disparo WhatsApp
  const handleSendWhatsApp = (telefone, mensagemPersonalizada) => {
    const rawNumber = telefone.replace(/\D/g, "");
    const encoded = encodeURIComponent(mensagemPersonalizada);
    window.open(`https://web.whatsapp.com/send?phone=${rawNumber}&text=${encoded}`, "_blank");
  };

  // Filtros
  const filteredClientes = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.telefone.includes(searchTerm) ||
      (c.placa && c.placa.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.veiculo && c.veiculo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalOrdensAbertas = ordens
    .filter((o) => o.status === "aberto")
    .reduce((acc, o) => acc + (o.valor || 0), 0);
  const totalOrdensEmAndamento = ordens
    .filter((o) => o.status === "em_andamento")
    .reduce((acc, o) => acc + (o.valor || 0), 0);
  const totalOrdensConcluidas = ordens
    .filter((o) => o.status === "concluido")
    .reduce((acc, o) => acc + (o.valor || 0), 0);

  return (
    <div className={classes.root}>
      {/* Top Header */}
      <div className={classes.header}>
        <div>
          <Typography variant="h4" className={classes.title}>
            CRM & Gestão de Relacionamento
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Gerencie clientes, histórico de serviços, pipeline de vendas e réguas automáticas de retenção.
          </Typography>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {activeTab === 0 && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              className={classes.actionButton}
              onClick={() => handleOpenClienteModal()}
            >
              Novo Cliente
            </Button>
          )}
          {activeTab === 1 && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              className={classes.actionButton}
              onClick={() => handleOpenOrdemModal()}
            >
              Nova Ordem / Negócio
            </Button>
          )}
          {activeTab === 2 && (
            <Button
              variant="outlined"
              color="primary"
              startIcon={<SettingsIcon />}
              className={classes.actionButton}
              onClick={() => setConfigModalOpen(true)}
            >
              Regras de Retenção
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <Paper className={classes.tabPaper} square>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="standard"
        >
          <Tab icon={<PersonIcon />} label="Clientes & Leads" />
          <Tab icon={<ReceiptIcon />} label="Negócios & Ordens de Serviço" />
          <Tab icon={<AutorenewIcon />} label="Automação & Retenção" />
        </Tabs>
      </Paper>

      {/* TAB 0: CLIENTES */}
      {activeTab === 0 && (
        <>
          <Paper className={classes.searchPaper}>
            <TextField
              variant="outlined"
              size="small"
              placeholder="Buscar por nome, telefone, veículo ou placa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "100%", maxWidth: 500 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                )
              }}
            />
            <Typography variant="body2" color="textSecondary">
              Total de <b>{filteredClientes.length}</b> cliente(s) listado(s)
            </Typography>
          </Paper>

          <Paper className={classes.tablePaper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><b>Nome</b></TableCell>
                  <TableCell><b>Contato</b></TableCell>
                  <TableCell><b>Veículo / Placa</b></TableCell>
                  <TableCell><b>Último Serviço</b></TableCell>
                  <TableCell align="center"><b>Status</b></TableCell>
                  <TableCell align="center"><b>Ações</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredClientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" style={{ padding: 40 }}>
                      <Typography color="textSecondary">
                        Nenhum cliente cadastrado ou encontrado com o filtro aplicado.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClientes.map((cli) => (
                    <TableRow key={cli.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2"><b>{cli.nome}</b></Typography>
                        {cli.email && (
                          <Typography variant="caption" color="textSecondary">
                            {cli.email}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span>{cli.telefone}</span>
                          <IconButton
                            size="small"
                            style={{ color: "#25D366" }}
                            title="Conversar via WhatsApp"
                            onClick={() => handleSendWhatsApp(cli.telefone, `Olá ${cli.nome}!`)}
                          >
                            <WhatsAppIcon fontSize="small" />
                          </IconButton>
                        </div>
                      </TableCell>
                      <TableCell>
                        {cli.veiculo || cli.placa ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <CarIcon fontSize="small" color="action" />
                            <span>{cli.veiculo || "Veículo"} {cli.placa ? `(${cli.placa})` : ""}</span>
                          </div>
                        ) : (
                          <span style={{ color: "#aaa" }}>-</span>
                        )}
                      </TableCell>
                      <TableCell>{cli.ultimoServico || "-"}</TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={cli.status === "ativo" ? "Ativo" : "Inativo"}
                          className={classes.chipStatus}
                          style={{
                            backgroundColor: cli.status === "ativo" ? "#e8f5e9" : "#ffebee",
                            color: cli.status === "ativo" ? "#2e7d32" : "#c62828"
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="primary"
                          title="Editar"
                          onClick={() => handleOpenClienteModal(cli)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="secondary"
                          title="Excluir"
                          onClick={() => handleDeleteCliente(cli.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}

      {/* TAB 1: NEGÓCIOS & ORDENS */}
      {activeTab === 1 && (
        <>
          <Grid container spacing={3} style={{ marginBottom: 24 }}>
            <Grid item xs={12} sm={4}>
              <Card className={classes.statCard}>
                <div className={classes.iconBox} style={{ backgroundColor: "#ff9800" }}>
                  <MoneyIcon />
                </div>
                <div>
                  <Typography variant="body2" color="textSecondary">
                    Em Aberto (Orçamentos)
                  </Typography>
                  <Typography variant="h6" style={{ fontWeight: 700 }}>
                    R$ {totalOrdensAbertas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </Typography>
                </div>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card className={classes.statCard}>
                <div className={classes.iconBox} style={{ backgroundColor: "#2196f3" }}>
                  <MoneyIcon />
                </div>
                <div>
                  <Typography variant="body2" color="textSecondary">
                    Em Andamento
                  </Typography>
                  <Typography variant="h6" style={{ fontWeight: 700 }}>
                    R$ {totalOrdensEmAndamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </Typography>
                </div>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card className={classes.statCard}>
                <div className={classes.iconBox} style={{ backgroundColor: "#4caf50" }}>
                  <MoneyIcon />
                </div>
                <div>
                  <Typography variant="body2" color="textSecondary">
                    Concluídos
                  </Typography>
                  <Typography variant="h6" style={{ fontWeight: 700 }}>
                    R$ {totalOrdensConcluidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </Typography>
                </div>
              </Card>
            </Grid>
          </Grid>

          <Paper className={classes.tablePaper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><b>Cliente</b></TableCell>
                  <TableCell><b>Descrição do Serviço / Negócio</b></TableCell>
                  <TableCell><b>Valor (R$)</b></TableCell>
                  <TableCell><b>Data de Criação</b></TableCell>
                  <TableCell align="center"><b>Status</b></TableCell>
                  <TableCell align="center"><b>Ações</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ordens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" style={{ padding: 40 }}>
                      <Typography color="textSecondary">
                        Nenhuma ordem de serviço cadastrada. Clique em "Nova Ordem / Negócio".
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  ordens.map((ord) => (
                    <TableRow key={ord.id} hover>
                      <TableCell><b>{ord.clienteNome}</b></TableCell>
                      <TableCell>{ord.descricao}</TableCell>
                      <TableCell>
                        <b>R$ {(ord.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b>
                      </TableCell>
                      <TableCell>{ord.dataCriacao || "-"}</TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={
                            ord.status === "concluido"
                              ? "Concluído"
                              : ord.status === "em_andamento"
                              ? "Em Andamento"
                              : "Aberto"
                          }
                          className={classes.chipStatus}
                          style={{
                            backgroundColor:
                              ord.status === "concluido"
                                ? "#e8f5e9"
                                : ord.status === "em_andamento"
                                ? "#e3f2fd"
                                : "#fff3e0",
                            color:
                              ord.status === "concluido"
                                ? "#2e7d32"
                                : ord.status === "em_andamento"
                                ? "#1565c0"
                                : "#ef6c00"
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="primary"
                          title="Editar"
                          onClick={() => handleOpenOrdemModal(ord)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="secondary"
                          title="Excluir"
                          onClick={() => handleDeleteOrdem(ord.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}

      {/* TAB 2: AUTOMAÇÃO & RETENÇÃO */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          {/* Inativos / Sumidos */}
          <Grid item xs={12} md={6}>
            <Paper className={classes.tablePaper} style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <Typography variant="h6" style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                    <AutorenewIcon color="secondary" /> Clientes Inativos ({clientesSumidos.length})
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Sem serviço há mais de {config.diasClienteSumido} dias
                  </Typography>
                </div>
              </div>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><b>Cliente</b></TableCell>
                    <TableCell><b>Último Serviço</b></TableCell>
                    <TableCell align="center"><b>Reengajamento</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clientesSumidos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" style={{ padding: 20 }}>
                        <Typography color="textSecondary" variant="body2">
                          Todos os clientes estão ativos! 🎉
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientesSumidos.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Typography variant="body2"><b>{c.nome}</b></Typography>
                          <Typography variant="caption" color="textSecondary">{c.telefone}</Typography>
                        </TableCell>
                        <TableCell>{c.ultimoServico || "-"}</TableCell>
                        <TableCell align="center">
                          <Button
                            variant="contained"
                            size="small"
                            style={{ backgroundColor: "#25D366", color: "#fff", textTransform: "none", fontWeight: 600 }}
                            startIcon={<WhatsAppIcon />}
                            onClick={() =>
                              handleSendWhatsApp(
                                c.telefone,
                                config.mensagemSumido.replace("{nome}", c.nome)
                              )
                            }
                          >
                            Resgatar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Grid>

          {/* Aniversariantes */}
          <Grid item xs={12} md={6}>
            <Paper className={classes.tablePaper} style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <Typography variant="h6" style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                    <CakeIcon style={{ color: "#e91e63" }} /> Aniversariantes do Mês ({aniversariantes.length})
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Envie felicitações e cupons de fidelização
                  </Typography>
                </div>
              </div>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><b>Cliente</b></TableCell>
                    <TableCell><b>Data de Nasc.</b></TableCell>
                    <TableCell align="center"><b>Felicitações</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {aniversariantes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" style={{ padding: 20 }}>
                        <Typography color="textSecondary" variant="body2">
                          Nenhum aniversariante registrado para este mês.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    aniversariantes.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Typography variant="body2"><b>{c.nome}</b></Typography>
                          <Typography variant="caption" color="textSecondary">{c.telefone}</Typography>
                        </TableCell>
                        <TableCell>{c.dataNascimento}</TableCell>
                        <TableCell align="center">
                          <Button
                            variant="contained"
                            size="small"
                            style={{ backgroundColor: "#e91e63", color: "#fff", textTransform: "none", fontWeight: 600 }}
                            startIcon={<WhatsAppIcon />}
                            onClick={() =>
                              handleSendWhatsApp(
                                c.telefone,
                                config.mensagemAniversario.replace("{nome}", c.nome)
                              )
                            }
                          >
                            Parabenizar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* MODAL: CADASTRAR/EDITAR CLIENTE */}
      <Dialog open={clienteModalOpen} onClose={() => setClienteModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {clienteFormData.id ? "Editar Cliente no CRM" : "Novo Cliente no CRM"}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Nome Completo *"
                variant="outlined"
                fullWidth
                size="small"
                value={clienteFormData.nome}
                onChange={(e) => setClienteFormData({ ...clienteFormData, nome: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Telefone / WhatsApp *"
                variant="outlined"
                fullWidth
                size="small"
                placeholder="5511999999999"
                value={clienteFormData.telefone}
                onChange={(e) => setClienteFormData({ ...clienteFormData, telefone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="E-mail"
                variant="outlined"
                fullWidth
                size="small"
                value={clienteFormData.email}
                onChange={(e) => setClienteFormData({ ...clienteFormData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Veículo / Modelo"
                variant="outlined"
                fullWidth
                size="small"
                value={clienteFormData.veiculo}
                onChange={(e) => setClienteFormData({ ...clienteFormData, veiculo: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Placa do Veículo"
                variant="outlined"
                fullWidth
                size="small"
                value={clienteFormData.placa}
                onChange={(e) => setClienteFormData({ ...clienteFormData, placa: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Data de Nascimento"
                type="date"
                InputLabelProps={{ shrink: true }}
                variant="outlined"
                fullWidth
                size="small"
                value={clienteFormData.dataNascimento}
                onChange={(e) => setClienteFormData({ ...clienteFormData, dataNascimento: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Data do Último Serviço"
                type="date"
                InputLabelProps={{ shrink: true }}
                variant="outlined"
                fullWidth
                size="small"
                value={clienteFormData.ultimoServico}
                onChange={(e) => setClienteFormData({ ...clienteFormData, ultimoServico: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Status do Cliente"
                variant="outlined"
                fullWidth
                size="small"
                value={clienteFormData.status}
                onChange={(e) => setClienteFormData({ ...clienteFormData, status: e.target.value })}
              >
                <MenuItem value="ativo">Ativo</MenuItem>
                <MenuItem value="inativo">Inativo</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Observações / Notas Internas"
                multiline
                rows={2}
                variant="outlined"
                fullWidth
                size="small"
                value={clienteFormData.notas}
                onChange={(e) => setClienteFormData({ ...clienteFormData, notas: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClienteModalOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleSaveCliente}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: CADASTRAR/EDITAR ORDEM */}
      <Dialog open={ordemModalOpen} onClose={() => setOrdemModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {ordemFormData.id ? "Editar Ordem / Negócio" : "Nova Ordem / Negócio"}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                select
                label="Vincular ao Cliente *"
                variant="outlined"
                fullWidth
                size="small"
                value={ordemFormData.clienteId}
                onChange={(e) => {
                  const sel = clientes.find((c) => c.id === e.target.value);
                  setOrdemFormData({
                    ...ordemFormData,
                    clienteId: e.target.value,
                    clienteNome: sel ? sel.nome : ""
                  });
                }}
              >
                {clientes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.nome} ({c.telefone})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Descrição do Serviço / Negócio *"
                multiline
                rows={2}
                variant="outlined"
                fullWidth
                size="small"
                value={ordemFormData.descricao}
                onChange={(e) => setOrdemFormData({ ...ordemFormData, descricao: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Valor do Serviço (R$)"
                type="number"
                variant="outlined"
                fullWidth
                size="small"
                value={ordemFormData.valor}
                onChange={(e) => setOrdemFormData({ ...ordemFormData, valor: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Estágio / Status"
                variant="outlined"
                fullWidth
                size="small"
                value={ordemFormData.status}
                onChange={(e) => setOrdemFormData({ ...ordemFormData, status: e.target.value })}
              >
                <MenuItem value="aberto">Aberto (Orçamento)</MenuItem>
                <MenuItem value="em_andamento">Em Andamento</MenuItem>
                <MenuItem value="concluido">Concluído</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrdemModalOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleSaveOrdem}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: CONFIGURAÇÕES DE RETENÇÃO */}
      <Dialog open={configModalOpen} onClose={() => setConfigModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Regras de Retenção e Automação CRM</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Dias para considerar cliente inativo/sumido"
                type="number"
                variant="outlined"
                fullWidth
                size="small"
                value={configFormData.diasClienteSumido}
                onChange={(e) =>
                  setConfigFormData({
                    ...configFormData,
                    diasClienteSumido: parseInt(e.target.value, 10) || 15
                  })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Modelo de Mensagem de Aniversário"
                multiline
                rows={3}
                variant="outlined"
                fullWidth
                helperText="Use {nome} para incluir o nome do cliente automaticamente"
                value={configFormData.mensagemAniversario}
                onChange={(e) =>
                  setConfigFormData({ ...configFormData, mensagemAniversario: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Modelo de Mensagem para Clientes Sumidos"
                multiline
                rows={3}
                variant="outlined"
                fullWidth
                helperText="Use {nome} para incluir o nome do cliente automaticamente"
                value={configFormData.mensagemSumido}
                onChange={(e) =>
                  setConfigFormData({ ...configFormData, mensagemSumido: e.target.value })
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigModalOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleSaveConfig}>
            Salvar Regras
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

// CRM Storage & API Service — Persistente no Backend com Cache Local
import { format, parseISO, isValid } from "date-fns";
import api from "./api";

const STORAGE_KEYS = {
  CLIENTES: "atendeai_crm_clientes",
  ORDENS: "atendeai_crm_ordens",
  CONFIG: "atendeai_crm_config"
};

const defaultConfig = {
  diasClienteSumido: 15,
  horarioEnvio: "09:00",
  mensagemAniversario: "Olá {nome}! 🎂 Parabéns pelo seu aniversário! A nossa equipe deseja um dia maravilhoso. Preparamos uma condição especial de 10% de desconto para você este mês!",
  mensagemSumido: "Olá {nome}! Sentimos sua falta por aqui. 🚗 Passando para saber se está precisando de algo ou gostaria de agendar um atendimento conosco!",
  autoEnvioAtivo: true
};

export const initCrmStorage = () => {
  // Inicialização de chaves de cache caso inexistentes
  if (!localStorage.getItem(STORAGE_KEYS.CONFIG)) {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(defaultConfig));
  }
};

// 1. CLIENTES / CONTATOS
export const getCrmClientes = async () => {
  initCrmStorage();
  try {
    const { data } = await api.get("/contacts", { params: { pageNumber: 1 } });
    const contactsList = Array.isArray(data.contacts) ? data.contacts : [];
    
    // Mapear contatos da API oficial
    const mapped = contactsList.map((c) => ({
      id: c.id.toString(),
      nome: c.name || "Sem Nome",
      telefone: c.number || "",
      email: c.email || "",
      dataNascimento: "",
      veiculo: "",
      placa: "",
      ultimoServico: c.updatedAt ? c.updatedAt.substring(0, 10) : "",
      status: "ativo",
      notas: "",
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));

    localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(mapped));
    return mapped;
  } catch (err) {
    const cached = localStorage.getItem(STORAGE_KEYS.CLIENTES);
    return cached ? JSON.parse(cached) : [];
  }
};

export const saveCrmCliente = async (clienteData) => {
  try {
    if (clienteData.id && !clienteData.id.startsWith("crm-")) {
      await api.put(`/contacts/${clienteData.id}`, {
        name: clienteData.nome,
        number: clienteData.telefone,
        email: clienteData.email
      });
    } else {
      await api.post("/contacts", {
        name: clienteData.nome,
        number: clienteData.telefone,
        email: clienteData.email
      });
    }
  } catch (err) {
    console.warn("Falha ao persistir contato no backend, atualizando cache", err);
  }

  return await getCrmClientes();
};

export const deleteCrmCliente = async (id) => {
  try {
    if (id && !id.startsWith("crm-")) {
      await api.delete(`/contacts/${id}`);
    }
  } catch (err) {
    console.warn("Falha ao excluir contato no backend", err);
  }

  return await getCrmClientes();
};

// 2. DEALS / ORDENS / NEGÓCIOS
export const getCrmOrdens = async () => {
  initCrmStorage();
  try {
    const { data } = await api.get("/crm/deals");
    const dealsList = Array.isArray(data) ? data : [];

    const mapped = dealsList.map((d) => ({
      id: d.id.toString(),
      clienteId: d.contactId ? d.contactId.toString() : "",
      clienteNome: d.contact?.name || d.name,
      descricao: d.notes || d.name,
      valor: Number(d.value) || 0,
      status: d.status === "won" ? "concluido" : d.status === "lost" ? "cancelado" : "em_andamento",
      dataCriacao: d.createdAt ? d.createdAt.substring(0, 10) : "",
      dataConclusao: d.expectedCloseDate || "",
      pipelineId: d.pipelineId,
      stageId: d.stageId,
      stageName: d.stage?.name || "Etapa",
      stageColor: d.stage?.color || "#3498db",
      priority: d.priority || "medium",
      notes: d.notes || "",
      raw: d
    }));

    localStorage.setItem(STORAGE_KEYS.ORDENS, JSON.stringify(mapped));
    return mapped;
  } catch (err) {
    const cached = localStorage.getItem(STORAGE_KEYS.ORDENS);
    return cached ? JSON.parse(cached) : [];
  }
};

export const saveCrmOrdem = async (ordemData) => {
  try {
    const statusBackend =
      ordemData.status === "concluido"
        ? "won"
        : ordemData.status === "cancelado"
        ? "lost"
        : "open";

    if (ordemData.id && !ordemData.id.startsWith("ord-")) {
      await api.put(`/crm/deals/${ordemData.id}`, {
        name: ordemData.clienteNome || ordemData.descricao || "Oportunidade",
        value: Number(ordemData.valor) || 0,
        notes: ordemData.descricao,
        status: statusBackend,
        contactId: ordemData.clienteId ? Number(ordemData.clienteId) : null,
        stageId: ordemData.stageId ? Number(ordemData.stageId) : undefined,
        pipelineId: ordemData.pipelineId ? Number(ordemData.pipelineId) : undefined,
        priority: ordemData.priority || "medium",
        expectedCloseDate: ordemData.dataConclusao || null
      });
    } else {
      await api.post("/crm/deals", {
        name: ordemData.clienteNome || ordemData.descricao || "Oportunidade",
        value: Number(ordemData.valor) || 0,
        notes: ordemData.descricao,
        status: statusBackend,
        contactId: ordemData.clienteId ? Number(ordemData.clienteId) : null,
        stageId: ordemData.stageId ? Number(ordemData.stageId) : undefined,
        pipelineId: ordemData.pipelineId ? Number(ordemData.pipelineId) : undefined,
        priority: ordemData.priority || "medium",
        expectedCloseDate: ordemData.dataConclusao || null
      });
    }
  } catch (err) {
    console.warn("Falha ao persistir negócio no backend", err);
  }

  return await getCrmOrdens();
};

export const deleteCrmOrdem = async (id) => {
  try {
    if (id && !id.startsWith("ord-")) {
      await api.delete(`/crm/deals/${id}`);
    }
  } catch (err) {
    console.warn("Falha ao excluir negócio no backend", err);
  }

  return await getCrmOrdens();
};

// 3. PIPELINES E MOVIMENTAÇÃO
export const getCrmPipelines = async () => {
  try {
    const { data } = await api.get("/crm/pipelines");
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return [];
  }
};

export const moveCrmDealStage = async (dealId, stageId, order = 0) => {
  try {
    const { data } = await api.put(`/crm/deals/${dealId}/stage`, { stageId, order });
    return data;
  } catch (err) {
    console.error("Falha ao mover estágio do negócio", err);
    throw err;
  }
};

export const getDealTimeline = async (dealId) => {
  try {
    const { data } = await api.get(`/crm/deals/${dealId}/timeline`);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return [];
  }
};

// 4. CONFIGURAÇÃO & RETENÇÃO
export const getCrmConfig = async () => {
  try {
    const { data } = await api.get("/crm/config");
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(data));
    return data;
  } catch (err) {
    const cached = localStorage.getItem(STORAGE_KEYS.CONFIG);
    return cached ? JSON.parse(cached) : defaultConfig;
  }
};

export const saveCrmConfig = async (newConfig) => {
  try {
    const { data } = await api.put("/crm/config", newConfig);
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(data));
    return data;
  } catch (err) {
    const merged = { ...defaultConfig, ...newConfig };
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(merged));
    return merged;
  }
};

export const getClientesSumidos = async () => {
  try {
    const { data } = await api.get("/crm/retention/missing");
    return Array.isArray(data) ? data.map((c) => ({
      id: c.id.toString(),
      nome: c.name,
      telefone: c.number,
      email: c.email,
      ultimoServico: c.updatedAt ? c.updatedAt.substring(0, 10) : "",
      status: "inativo"
    })) : [];
  } catch (err) {
    return [];
  }
};

export const getClientesAniversariantes = async () => {
  try {
    const { data } = await api.get("/crm/retention/birthdays");
    return Array.isArray(data) ? data.map((c) => ({
      id: c.id.toString(),
      nome: c.name,
      telefone: c.number,
      email: c.email,
      status: "ativo"
    })) : [];
  } catch (err) {
    return [];
  }
};

export const formatCurrency = (val) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(val || 0);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, "dd/MM/yyyy") : dateStr;
  } catch {
    return dateStr;
  }
};

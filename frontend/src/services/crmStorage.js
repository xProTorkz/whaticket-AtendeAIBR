// CRM Storage & Business Logic Service
import { format, differenceInDays, parseISO, isValid } from "date-fns";

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

const initialClientes = [
  {
    id: "crm-1",
    nome: "Carlos Eduardo Silva",
    telefone: "5511988887777",
    email: "carlos.silva@exemplo.com",
    dataNascimento: "1988-09-14",
    veiculo: "Toyota Corolla 2.0",
    placa: "BRA2E19",
    ultimoServico: "2026-08-10",
    status: "ativo",
    notas: "Cliente preferencial, troca de óleo a cada 10.000km",
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-08-10T14:30:00.000Z"
  },
  {
    id: "crm-2",
    nome: "Mariana Costa Santos",
    telefone: "5511977776666",
    email: "mariana.costa@exemplo.com",
    dataNascimento: "1994-03-22",
    veiculo: "Honda Civic G10",
    placa: "ABC1D23",
    ultimoServico: "2026-07-05",
    status: "inativo",
    notas: "Revisão geral realizada há mais de 60 dias",
    createdAt: "2026-02-10T09:00:00.000Z",
    updatedAt: "2026-07-05T16:00:00.000Z"
  },
  {
    id: "crm-3",
    nome: "Roberto Almeida Filho",
    telefone: "5511966665555",
    email: "roberto.almeida@exemplo.com",
    dataNascimento: "1985-09-15",
    veiculo: "Jeep Compass Longitude",
    placa: "XYZ9K88",
    ultimoServico: "2026-09-01",
    status: "ativo",
    notas: "Interesse em balanceamento e alinhamento",
    createdAt: "2026-03-20T11:00:00.000Z",
    updatedAt: "2026-09-01T10:20:00.000Z"
  },
  {
    id: "crm-4",
    nome: "Fernanda Lima Ramos",
    telefone: "5511955554444",
    email: "fernanda.lima@exemplo.com",
    dataNascimento: "1991-11-30",
    veiculo: "Hyundai Creta Prestige",
    placa: "KJH4G56",
    ultimoServico: "2026-06-15",
    status: "inativo",
    notas: "Cliente ausente há quase 3 meses",
    createdAt: "2026-01-05T08:30:00.000Z",
    updatedAt: "2026-06-15T15:45:00.000Z"
  }
];

const initialOrdens = [
  {
    id: "ord-1",
    clienteId: "crm-1",
    clienteNome: "Carlos Eduardo Silva",
    descricao: "Revisão periódica + Troca de pastilhas de freio",
    valor: 850.0,
    status: "concluido",
    dataCriacao: "2026-08-08",
    dataConclusao: "2026-08-10"
  },
  {
    id: "ord-2",
    clienteId: "crm-3",
    clienteNome: "Roberto Almeida Filho",
    descricao: "Troca de amortecedores dianteiros e alinhamento 3D",
    valor: 1420.0,
    status: "em_andamento",
    dataCriacao: "2026-09-12"
  },
  {
    id: "ord-3",
    clienteId: "crm-2",
    clienteNome: "Mariana Costa Santos",
    descricao: "Orçamento de higienização de ar-condicionado e filtro",
    valor: 280.0,
    status: "aberto",
    dataCriacao: "2026-09-14"
  }
];

export const initCrmStorage = () => {
  if (!localStorage.getItem(STORAGE_KEYS.CLIENTES)) {
    localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(initialClientes));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ORDENS)) {
    localStorage.setItem(STORAGE_KEYS.ORDENS, JSON.stringify(initialOrdens));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CONFIG)) {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(defaultConfig));
  }
};

export const getCrmClientes = () => {
  initCrmStorage();
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CLIENTES);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    return [];
  }
};

export const saveCrmCliente = (clienteData) => {
  const clientes = getCrmClientes();
  let updatedClientes;

  if (clienteData.id) {
    updatedClientes = clientes.map((c) =>
      c.id === clienteData.id
        ? { ...c, ...clienteData, updatedAt: new Date().toISOString() }
        : c
    );
  } else {
    const newCliente = {
      ...clienteData,
      id: `crm-${Date.now()}`,
      status: clienteData.status || "ativo",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    updatedClientes = [newCliente, ...clientes];
  }

  localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(updatedClientes));
  return updatedClientes;
};

export const deleteCrmCliente = (id) => {
  const clientes = getCrmClientes();
  const filtered = clientes.filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(filtered));
  return filtered;
};

export const getCrmOrdens = () => {
  initCrmStorage();
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ORDENS);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    return [];
  }
};

export const saveCrmOrdem = (ordemData) => {
  const ordens = getCrmOrdens();
  let updatedOrdens;

  if (ordemData.id) {
    updatedOrdens = ordens.map((o) =>
      o.id === ordemData.id ? { ...o, ...ordemData } : o
    );
  } else {
    const newOrdem = {
      ...ordemData,
      id: `ord-${Date.now()}`,
      dataCriacao: format(new Date(), "yyyy-MM-dd"),
      status: ordemData.status || "aberto"
    };
    updatedOrdens = [newOrdem, ...ordens];
  }

  localStorage.setItem(STORAGE_KEYS.ORDENS, JSON.stringify(updatedOrdens));
  return updatedOrdens;
};

export const deleteCrmOrdem = (id) => {
  const ordens = getCrmOrdens();
  const filtered = ordens.filter((o) => o.id !== id);
  localStorage.setItem(STORAGE_KEYS.ORDENS, JSON.stringify(filtered));
  return filtered;
};

export const getCrmConfig = () => {
  initCrmStorage();
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CONFIG);
    return data ? JSON.parse(data) : defaultConfig;
  } catch (err) {
    return defaultConfig;
  }
};

export const saveCrmConfig = (newConfig) => {
  const merged = { ...defaultConfig, ...newConfig };
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(merged));
  return merged;
};

export const getClientesSumidos = (diasLimite) => {
  const clientes = getCrmClientes();
  const hoje = new Date();
  const limite = diasLimite || getCrmConfig().diasClienteSumido || 15;

  return clientes.filter((c) => {
    if (!c.ultimoServico) return true;
    try {
      const dataServico = parseISO(c.ultimoServico);
      if (!isValid(dataServico)) return false;
      const diferenca = differenceInDays(hoje, dataServico);
      return diferenca >= limite;
    } catch {
      return false;
    }
  });
};

export const getClientesAniversariantes = () => {
  const clientes = getCrmClientes();
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;

  return clientes.filter((c) => {
    if (!c.dataNascimento) return false;
    try {
      const partes = c.dataNascimento.split("-");
      if (partes.length >= 2) {
        const mesNasc = parseInt(partes[1], 10);
        return mesNasc === mesAtual;
      }
      return false;
    } catch {
      return false;
    }
  });
};

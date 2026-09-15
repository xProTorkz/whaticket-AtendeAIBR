import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import {
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Box,
  TextField,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Divider
} from "@material-ui/core";
import {
  Business as BusinessIcon,
  Palette as PaletteIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  WhatsApp as WhatsAppIcon,
  ListAlt as ListAltIcon,
  AssignmentInd as AssignmentIndIcon,
  CheckCircle as CheckCircleIcon,
  ThumbUp as ThumbUpIcon
} from "@material-ui/icons";
import { toast } from "react-toastify";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    padding: theme.spacing(3),
    maxWidth: 1000,
    margin: "0 auto",
  },
  paper: {
    padding: theme.spacing(4),
    borderRadius: 8,
    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
  },
  stepper: {
    padding: theme.spacing(3, 0, 4),
    backgroundColor: "transparent",
  },
  stepContent: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(4),
  },
  actions: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: theme.spacing(4),
  },
  colorPreview: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "2px solid #ddd",
    display: "inline-block",
  },
}));

const steps = [
  { id: "company_info", label: "Dados da Empresa", icon: <BusinessIcon /> },
  { id: "branding", label: "Identidade Visual", icon: <PaletteIcon /> },
  { id: "admin_profile", label: "Perfil Admin", icon: <PersonIcon /> },
  { id: "team", label: "Equipe", icon: <GroupIcon /> },
  { id: "whatsapp", label: "WhatsApp", icon: <WhatsAppIcon /> },
  { id: "queues", label: "Filas", icon: <ListAltIcon /> },
  { id: "crm_pipeline", label: "Funil CRM", icon: <AssignmentIndIcon /> },
  { id: "testing", label: "Teste Rápido", icon: <CheckCircleIcon /> },
  { id: "completed", label: "Conclusão", icon: <ThumbUpIcon /> },
];

const Onboarding = () => {
  const classes = useStyles();
  const history = useHistory();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    document: "",
    phone: "",
    brandName: "",
    primaryColor: "#006b52",
    secondaryColor: "#004d40",
    adminName: "",
    firstAgentName: "",
    firstAgentEmail: "",
    queueName: "Atendimento Geral",
    pipelineName: "Funil Comercial",
    testMessage: "Olá! Atendimento de teste iniciado.",
  });

  useEffect(() => {
    fetchOnboardingStatus();
  }, []);

  const fetchOnboardingStatus = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/onboarding");
      const currentStepId = data.onboarding?.currentStep || "company_info";
      const stepIndex = steps.findIndex((s) => s.id === currentStepId);
      if (stepIndex !== -1) {
        setActiveStep(stepIndex);
      }
      if (data.onboarding?.metadata) {
        setFormData((prev) => ({ ...prev, ...data.onboarding.metadata }));
      }
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = async (isSaveAndExit = false) => {
    setSaving(true);
    const currentStepObj = steps[activeStep];
    const nextStepIndex = Math.min(activeStep + 1, steps.length - 1);
    const nextStepObj = steps[nextStepIndex];

    try {
      await api.post("/onboarding/step", {
        step: currentStepObj.id,
        data: formData,
        nextStep: isSaveAndExit ? currentStepObj.id : nextStepObj.id,
      });

      if (isSaveAndExit) {
        toast.info("Progresso do onboarding salvo com sucesso!");
        history.push("/");
        return;
      }

      if (activeStep === steps.length - 1) {
        await api.post("/onboarding/complete");
        toast.success("Parabéns! Onboarding concluído com sucesso!");
        history.push("/");
        return;
      }

      setActiveStep(nextStepIndex);
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const renderStepContent = (stepIndex) => {
    switch (stepIndex) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6">Passo 1: Confirme os dados da sua empresa</Typography>
              <Typography variant="body2" color="textSecondary">
                Essas informações identificam sua organização no sistema.
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Razão Social / Nome da Empresa"
                variant="outlined"
                fullWidth
                value={formData.companyName}
                onChange={(e) => handleInputChange("companyName", e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="CNPJ ou CPF"
                variant="outlined"
                fullWidth
                value={formData.document}
                onChange={(e) => handleInputChange("document", e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Telefone Comercial"
                variant="outlined"
                fullWidth
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6">Passo 2: Identidade Visual e Marca</Typography>
              <Typography variant="body2" color="textSecondary">
                Personalize as cores e nome exibidos no painel e na tela de login.
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nome Fantasia / Marca"
                variant="outlined"
                fullWidth
                value={formData.brandName}
                onChange={(e) => handleInputChange("brandName", e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" gap={2}>
                <TextField
                  label="Cor Primária"
                  variant="outlined"
                  value={formData.primaryColor}
                  onChange={(e) => handleInputChange("primaryColor", e.target.value)}
                />
                <span
                  className={classes.colorPreview}
                  style={{ backgroundColor: formData.primaryColor }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" gap={2}>
                <TextField
                  label="Cor Secundária"
                  variant="outlined"
                  value={formData.secondaryColor}
                  onChange={(e) => handleInputChange("secondaryColor", e.target.value)}
                />
                <span
                  className={classes.colorPreview}
                  style={{ backgroundColor: formData.secondaryColor }}
                />
              </Box>
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6">Passo 3: Perfil do Administrador Principal</Typography>
              <Typography variant="body2" color="textSecondary">
                Defina os dados do gestor responsável pela gestão da conta.
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nome do Gestor"
                variant="outlined"
                fullWidth
                value={formData.adminName}
                onChange={(e) => handleInputChange("adminName", e.target.value)}
              />
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6">Passo 4: Primeiro Membro da Equipe</Typography>
              <Typography variant="body2" color="textSecondary">
                Adicione um colega de equipe para iniciar o atendimento compartilhado.
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nome do Atendente"
                variant="outlined"
                fullWidth
                value={formData.firstAgentName}
                onChange={(e) => handleInputChange("firstAgentName", e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="E-mail do Atendente"
                variant="outlined"
                fullWidth
                value={formData.firstAgentEmail}
                onChange={(e) => handleInputChange("firstAgentEmail", e.target.value)}
              />
            </Grid>
          </Grid>
        );

      case 4:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6">Passo 5: Conexão WhatsApp</Typography>
              <Typography variant="body2" color="textSecondary">
                Sua conexão de WhatsApp pode ser pareada imediatamente ou a qualquer momento na aba
                Conexões.
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Card variant="outlined" style={{ padding: 16 }}>
                <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
                  Pronto para parear seu número comercial?
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Você poderá escanear o QR Code oficial na tela Conexões a qualquer momento.
                </Typography>
              </Card>
            </Grid>
          </Grid>
        );

      case 5:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6">Passo 6: Primeira Fila de Atendimento</Typography>
              <Typography variant="body2" color="textSecondary">
                As filas organizam o fluxo de mensagens por departamento (ex: Vendas, Suporte, Financeiro).
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nome da Fila Inicial"
                variant="outlined"
                fullWidth
                value={formData.queueName}
                onChange={(e) => handleInputChange("queueName", e.target.value)}
              />
            </Grid>
          </Grid>
        );

      case 6:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6">Passo 7: Funil de Vendas CRM</Typography>
              <Typography variant="body2" color="textSecondary">
                Configure seu primeiro funil para acompanhar oportunidades de negócio.
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nome do Pipeline / Funil"
                variant="outlined"
                fullWidth
                value={formData.pipelineName}
                onChange={(e) => handleInputChange("pipelineName", e.target.value)}
              />
            </Grid>
          </Grid>
        );

      case 7:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6">Passo 8: Teste de Atendimento</Typography>
              <Typography variant="body2" color="textSecondary">
                Simule uma resposta rápida de boas-vindas para validar a experiência do cliente.
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Mensagem Padrão de Boas-Vindas"
                variant="outlined"
                multiline
                rows={3}
                fullWidth
                value={formData.testMessage}
                onChange={(e) => handleInputChange("testMessage", e.target.value)}
              />
            </Grid>
          </Grid>
        );

      case 8:
        return (
          <Box textAlign="center" py={4}>
            <ThumbUpIcon style={{ fontSize: 64, color: "#2e7d32", marginBottom: 16 }} />
            <Typography variant="h5" gutterBottom style={{ fontWeight: 700 }}>
              Tudo pronto para começar!
            </Typography>
            <Typography variant="body1" color="textSecondary" style={{ maxWidth: 600, margin: "0 auto" }}>
              Sua conta está configurada e pronta para revolucionar seu atendimento comercial. Clique em
              Concluir para acessar seu Dashboard principal.
            </Typography>
          </Box>
        );

      default:
        return null;
    }
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

  return (
    <MainContainer className={classes.mainContainer}>
      <MainHeader>
        <Title>Onboarding Guiado — AtendeAI BR</Title>
      </MainHeader>

      <Paper className={classes.paper}>
        <Stepper activeStep={activeStep} alternativeLabel className={classes.stepper}>
          {steps.map((step) => (
            <Step key={step.id}>
              <StepLabel>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Divider />

        <Box className={classes.stepContent}>{renderStepContent(activeStep)}</Box>

        <Divider />

        <Box className={classes.actions}>
          <Button
            variant="outlined"
            onClick={() => handleNext(true)}
            disabled={saving}
          >
            Salvar e Continuar Depois
          </Button>

          <Box display="flex" gap={2}>
            {activeStep > 0 && (
              <Button onClick={handleBack} disabled={saving}>
                Voltar
              </Button>
            )}
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleNext(false)}
              disabled={saving}
            >
              {activeStep === steps.length - 1 ? "Concluir Onboarding" : "Avançar"}
            </Button>
          </Box>
        </Box>
      </Paper>
    </MainContainer>
  );
};

export default Onboarding;

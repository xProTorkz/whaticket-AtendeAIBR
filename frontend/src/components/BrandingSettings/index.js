import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Paper,
  Grid,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress
} from "@material-ui/core";
import { Palette as PaletteIcon, Save as SaveIcon } from "@material-ui/icons";
import { toast } from "react-toastify";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  paper: {
    padding: theme.spacing(3),
    borderRadius: 8,
  },
  colorPreview: {
    width: 42,
    height: 42,
    borderRadius: 8,
    border: "2px solid #ccc",
    display: "inline-block",
  },
}));

const BrandingSettings = () => {
  const classes = useStyles();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState({
    brandName: "",
    brandLogo: "",
    primaryColor: "#006b52",
    secondaryColor: "#004d40",
    brandFavicon: "",
    loginMessage: "",
  });

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/branding/current");
      setBranding({
        brandName: data.brandName || "",
        brandLogo: data.brandLogo || "",
        primaryColor: data.primaryColor || "#006b52",
        secondaryColor: data.secondaryColor || "#004d40",
        brandFavicon: data.brandFavicon || "",
        loginMessage: data.loginMessage || "",
      });
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/branding", branding);
      toast.success("Identidade visual da empresa atualizada com sucesso!");
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper className={classes.paper} variant="outlined">
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <PaletteIcon color="primary" />
        <Typography variant="h6" style={{ fontWeight: 600 }}>
          Identidade Visual & Branding (White-Label)
        </Typography>
      </Box>
      <Typography variant="body2" color="textSecondary" style={{ marginBottom: 24 }}>
        Personalize o nome da sua marca, as cores principais e a mensagem exibida na tela de login
        para os seus atendentes e clientes.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Nome da Marca / Empresa"
            variant="outlined"
            fullWidth
            value={branding.brandName}
            onChange={(e) => setBranding({ ...branding, brandName: e.target.value })}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="URL do Logotipo"
            variant="outlined"
            fullWidth
            value={branding.brandLogo}
            onChange={(e) => setBranding({ ...branding, brandLogo: e.target.value })}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box display="flex" alignItems="center" gap={2}>
            <TextField
              label="Cor Primária"
              variant="outlined"
              fullWidth
              value={branding.primaryColor}
              onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
            />
            <span
              className={classes.colorPreview}
              style={{ backgroundColor: branding.primaryColor }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box display="flex" alignItems="center" gap={2}>
            <TextField
              label="Cor Secundária"
              variant="outlined"
              fullWidth
              value={branding.secondaryColor}
              onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
            />
            <span
              className={classes.colorPreview}
              style={{ backgroundColor: branding.secondaryColor }}
            />
          </Box>
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Mensagem de Boas-Vindas na Tela de Login"
            variant="outlined"
            multiline
            rows={2}
            fullWidth
            value={branding.loginMessage}
            onChange={(e) => setBranding({ ...branding, loginMessage: e.target.value })}
          />
        </Grid>

        <Grid item xs={12}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            Salvar Identidade Visual
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default BrandingSettings;

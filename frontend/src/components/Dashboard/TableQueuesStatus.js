import React from "react";
import Paper from "@material-ui/core/Paper";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import Chip from "@material-ui/core/Chip";
import Skeleton from "@material-ui/lab/Skeleton";
import { makeStyles } from "@material-ui/core/styles";
import WarningIcon from "@material-ui/icons/Warning";

const useStyles = makeStyles((theme) => ({
  container: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2)
  },
  title: {
    padding: theme.spacing(2),
    fontWeight: "bold",
    color: theme.palette.text.primary
  },
  queueBadge: {
    display: "inline-block",
    width: 12,
    height: 12,
    borderRadius: "50%",
    marginRight: 8,
    verticalAlign: "middle"
  },
  alertChip: {
    backgroundColor: theme.palette.error.main,
    color: "#fff",
    fontWeight: "bold"
  },
  okChip: {
    backgroundColor: theme.palette.success.main,
    color: "#fff"
  }
}));

export default function TableQueuesStatus({ queues = [], loading }) {
  const classes = useStyles();

  function formatTime(minutes) {
    if (minutes === null || minutes === undefined || isNaN(minutes)) {
      return "--";
    }
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  if (loading) {
    return <Skeleton variant="rect" height={150} />;
  }

  return (
    <TableContainer component={Paper} className={classes.container}>
      <Typography variant="h6" className={classes.title}>
        Métricas Operacionais por Fila / Departamento
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Fila / Departamento</TableCell>
            <TableCell align="center">SLA Meta</TableCell>
            <TableCell align="center">Aguardando (Fila)</TableCell>
            <TableCell align="center">Acima do Limite (SLA)</TableCell>
            <TableCell align="center">Finalizados</TableCell>
            <TableCell align="center">T.M. Espera</TableCell>
            <TableCell align="center">T.M. Atendimento</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {queues.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                Nenhuma fila cadastrada para a empresa.
              </TableCell>
            </TableRow>
          ) : (
            queues.map((q) => (
              <TableRow key={q.id}>
                <TableCell>
                  <span
                    className={classes.queueBadge}
                    style={{ backgroundColor: q.color || "#7C7C7C" }}
                  />
                  {q.name}
                </TableCell>
                <TableCell align="center">{q.sla ? `${q.sla} min` : "15 min"}</TableCell>
                <TableCell align="center">
                  <strong>{q.pending ?? 0}</strong>
                </TableCell>
                <TableCell align="center">
                  {q.aboveSla > 0 ? (
                    <Chip
                      icon={<WarningIcon style={{ color: "#fff" }} />}
                      label={`${q.aboveSla} ticket${q.aboveSla > 1 ? "s" : ""}`}
                      size="small"
                      className={classes.alertChip}
                    />
                  ) : (
                    <Chip
                      label="0"
                      size="small"
                      className={classes.okChip}
                    />
                  )}
                </TableCell>
                <TableCell align="center">{q.closed ?? 0}</TableCell>
                <TableCell align="center">{formatTime(q.avgWaitTime)}</TableCell>
                <TableCell align="center">{formatTime(q.avgSupportTime)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

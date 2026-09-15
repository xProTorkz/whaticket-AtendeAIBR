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
import { makeStyles } from "@material-ui/core/styles";
import WarningIcon from "@material-ui/icons/Warning";

const useStyles = makeStyles((theme) => ({
  container: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    borderLeft: `4px solid ${theme.palette.error.main}`
  },
  header: {
    padding: theme.spacing(2),
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    backgroundColor: "rgba(244, 67, 54, 0.08)"
  },
  title: {
    fontWeight: "bold",
    color: theme.palette.error.main
  },
  queueBadge: {
    display: "inline-block",
    width: 10,
    height: 10,
    borderRadius: "50%",
    marginRight: 6,
    verticalAlign: "middle"
  },
  exceededChip: {
    backgroundColor: theme.palette.error.main,
    color: "#fff",
    fontWeight: "bold"
  }
}));

export default function TableSlaAlerts({ alerts = [] }) {
  const classes = useStyles();

  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <TableContainer component={Paper} className={classes.container}>
      <div className={classes.header}>
        <WarningIcon style={{ color: "#f44336" }} />
        <Typography variant="h6" className={classes.title}>
          Alertas de SLA Estourado ({alerts.length} ticket{alerts.length > 1 ? "s" : ""})
        </Typography>
      </div>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Ticket</TableCell>
            <TableCell>Contato</TableCell>
            <TableCell>Fila / Departamento</TableCell>
            <TableCell align="center">Tempo Aguardando</TableCell>
            <TableCell align="center">Meta SLA</TableCell>
            <TableCell align="center">Atraso</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {alerts.map((a) => {
            const delay = Math.max(0, a.waitMinutes - a.slaLimit);
            return (
              <TableRow key={a.id}>
                <TableCell>
                  <strong>#{a.id}</strong>
                </TableCell>
                <TableCell>{a.contactName}</TableCell>
                <TableCell>
                  <span
                    className={classes.queueBadge}
                    style={{ backgroundColor: a.queueColor || "#7C7C7C" }}
                  />
                  {a.queueName}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={`${a.waitMinutes} min`}
                    size="small"
                    className={classes.exceededChip}
                  />
                </TableCell>
                <TableCell align="center">{a.slaLimit} min</TableCell>
                <TableCell align="center">
                  <span style={{ color: "#d32f2f", fontWeight: "bold" }}>
                    +{delay} min
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

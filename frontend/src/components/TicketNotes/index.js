import React, { useState, useEffect, useContext } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "react-toastify";

import {
  makeStyles,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  CircularProgress,
  Divider
} from "@material-ui/core";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import LockOutlinedIcon from "@material-ui/icons/LockOutlined";
import NoteAddIcon from "@material-ui/icons/NoteAdd";

import api from "../../services/api";
import openSocket from "../../services/socket-io";
import { AuthContext } from "../../context/Auth/AuthContext";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    marginTop: theme.spacing(1),
    padding: theme.spacing(1),
  },
  header: {
    display: "flex",
    alignItems: "center",
    marginBottom: theme.spacing(1),
    color: "#b78103",
    fontWeight: 600,
    fontSize: "0.95rem",
    gap: 6
  },
  securityNotice: {
    fontSize: "0.75rem",
    color: "#795548",
    backgroundColor: "#fffde7",
    padding: theme.spacing(0.75),
    borderRadius: 4,
    marginBottom: theme.spacing(1),
    border: "1px dashed #ffe082",
    display: "flex",
    alignItems: "center",
    gap: 4
  },
  inputArea: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1.5),
  },
  notesList: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
    maxHeight: 280,
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  noteCard: {
    padding: theme.spacing(1),
    backgroundColor: "#fff9c4",
    border: "1px solid #fff176",
    borderRadius: 6,
    position: "relative",
  },
  noteHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  author: {
    fontSize: "0.78rem",
    fontWeight: 700,
    color: "#424242",
  },
  date: {
    fontSize: "0.72rem",
    color: "#757575",
  },
  noteBody: {
    fontSize: "0.85rem",
    color: "#212121",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  emptyNotice: {
    fontSize: "0.8rem",
    color: "#9e9e9e",
    textAlign: "center",
    fontStyle: "italic",
    padding: theme.spacing(1),
  },
}));

const TicketNotes = ({ ticketId }) => {
  const classes = useStyles();
  const { user: loggedInUser } = useContext(AuthContext);

  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!ticketId) return;

    const fetchNotes = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/tickets/${ticketId}/notes`);
        setNotes(data);
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) return;
    const socket = openSocket();

    const handleSocketEvent = (data) => {
      if (data.ticketId !== Number(ticketId)) return;

      if (data.action === "create") {
        setNotes((prev) => [data.note, ...prev.filter((n) => n.id !== data.note.id)]);
      }

      if (data.action === "delete") {
        setNotes((prev) => prev.filter((n) => n.id !== data.noteId));
      }
    };

    socket.on(`company-${loggedInUser?.companyId || 1}-ticket-note`, handleSocketEvent);
    socket.on("ticket-note", handleSocketEvent);

    return () => {
      socket.disconnect();
    };
  }, [ticketId, loggedInUser?.companyId]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmitting(true);
    try {
      const { data } = await api.post(`/tickets/${ticketId}/notes`, {
        body: newNote.trim(),
      });
      setNotes((prev) => [data, ...prev.filter((n) => n.id !== data.id)]);
      setNewNote("");
      toast.success("Nota interna adicionada.");
    } catch (err) {
      toastError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await api.delete(`/tickets/${ticketId}/notes/${noteId}`);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast.success("Nota interna excluída.");
    } catch (err) {
      toastError(err);
    }
  };

  const canDeleteNote = (note) => {
    if (!loggedInUser) return false;
    if (loggedInUser.isSuperAdmin || loggedInUser.profile === "admin" || loggedInUser.profile === "manager") {
      return true;
    }
    return note.userId && Number(note.userId) === Number(loggedInUser.id);
  };

  return (
    <Paper variant="outlined" className={classes.root}>
      <div className={classes.header}>
        <LockOutlinedIcon fontSize="small" />
        <span>Notas Internas da Equipe</span>
      </div>

      <div className={classes.securityNotice}>
        <LockOutlinedIcon style={{ fontSize: 14 }} />
        <span>Visível apenas para a equipe. Nunca é enviada ao cliente.</span>
      </div>

      {loggedInUser?.profile !== "visitor" && (
        <form onSubmit={handleAddNote} className={classes.inputArea}>
          <TextField
            placeholder="Escreva uma nota interna sobre este atendimento..."
            variant="outlined"
            multiline
            rows={2}
            size="small"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            fullWidth
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="small"
            disabled={submitting || !newNote.trim()}
            startIcon={submitting ? <CircularProgress size={16} /> : <NoteAddIcon />}
          >
            Salvar Nota
          </Button>
        </form>
      )}

      <Divider style={{ margin: "8px 0" }} />

      <div className={classes.notesList}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 8 }}>
            <CircularProgress size={24} />
          </div>
        ) : notes.length === 0 ? (
          <div className={classes.emptyNotice}>Nenhuma nota interna neste ticket.</div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className={classes.noteCard}>
              <div className={classes.noteHeader}>
                <span className={classes.author}>{note.user?.name || "Equipe"}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span className={classes.date}>
                    {note.createdAt && format(parseISO(note.createdAt), "dd/MM/yyyy HH:mm")}
                  </span>
                  {canDeleteNote(note) && (
                    <IconButton
                      size="small"
                      style={{ padding: 2, color: "#d32f2f" }}
                      onClick={() => handleDeleteNote(note.id)}
                    >
                      <DeleteOutlineIcon style={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                </div>
              </div>
              <Typography className={classes.noteBody}>{note.body}</Typography>
            </div>
          ))
        )}
      </div>
    </Paper>
  );
};

export default TicketNotes;

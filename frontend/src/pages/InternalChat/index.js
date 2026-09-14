import React, { useState, useEffect, useContext, useRef } from "react";
import {
  makeStyles,
  Grid,
  Typography,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  IconButton,
  Chip,
  CircularProgress,
  Box,
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import SendIcon from "@material-ui/icons/Send";
import ForumIcon from "@material-ui/icons/Forum";
import LockOutlinedIcon from "@material-ui/icons/LockOutlined";
import DoneAllIcon from "@material-ui/icons/DoneAll";
import DoneIcon from "@material-ui/icons/Done";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import openSocket from "../../services/socket-io";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    height: "calc(100vh - 64px)",
    overflow: "hidden",
    backgroundColor: theme.palette.background.default,
  },
  container: {
    height: "100%",
    width: "100%",
  },
  sidebar: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    borderRight: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
  sidebarHeader: {
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  searchField: {
    marginTop: theme.spacing(1),
  },
  colleaguesList: {
    flex: 1,
    overflowY: "auto",
    padding: 0,
  },
  colleagueItem: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    "&.Mui-selected": {
      backgroundColor: theme.palette.action.selected,
    },
  },
  chatArea: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    backgroundColor: theme.palette.background.paper,
  },
  chatHeader: {
    padding: theme.spacing(2),
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
  chatHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
  },
  securityChip: {
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
    fontWeight: 500,
    fontSize: "0.75rem",
  },
  messagesArea: {
    flex: 1,
    overflowY: "auto",
    padding: theme.spacing(2),
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
    backgroundColor: theme.palette.type === "dark" ? "#1e1e1e" : "#f4f6f8",
  },
  messageBubble: {
    maxWidth: "70%",
    padding: theme.spacing(1.2, 1.8),
    borderRadius: 14,
    position: "relative",
    wordBreak: "break-word",
    fontSize: "0.92rem",
    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
  },
  messageSent: {
    alignSelf: "flex-end",
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    borderBottomRightRadius: 2,
  },
  messageReceived: {
    alignSelf: "flex-start",
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    borderBottomLeftRadius: 2,
  },
  messageMeta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
    fontSize: "0.7rem",
    opacity: 0.85,
  },
  inputArea: {
    padding: theme.spacing(1.5, 2),
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
  },
  inputField: {
    flex: 1,
  },
  emptyChat: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(4),
    textAlign: "center",
    color: theme.palette.text.secondary,
  },
  emptyChatIcon: {
    fontSize: 64,
    marginBottom: theme.spacing(2),
    color: theme.palette.divider,
  },
  roleChip: {
    fontSize: "0.68rem",
    height: 18,
    marginLeft: theme.spacing(0.5),
  },
  unreadBadge: {
    marginRight: theme.spacing(1),
  },
  securityNoticeFooter: {
    fontSize: "0.72rem",
    color: theme.palette.text.secondary,
    textAlign: "center",
    padding: theme.spacing(0.5),
    backgroundColor: theme.palette.type === "dark" ? "#2a2a2a" : "#fafafa",
    borderTop: `1px solid ${theme.palette.divider}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
}));

const getRoleLabel = (profile) => {
  switch (profile) {
    case "superadmin":
      return "Superadmin";
    case "admin":
      return "Admin";
    case "manager":
      return "Gerente";
    case "agent":
      return "Atendente";
    case "collaborator":
      return "Colaborador";
    case "visitor":
      return "Visitante";
    default:
      return profile || "Usuário";
  }
};

const InternalChat = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);

  const [colleagues, setColleagues] = useState([]);
  const [selectedColleague, setSelectedColleague] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loadingColleagues, setLoadingColleagues] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Carregar colegas do mesmo tenant
  useEffect(() => {
    let isMounted = true;
    const loadColleagues = async () => {
      try {
        setLoadingColleagues(true);
        const { data } = await api.get("/internal-chat/users");
        if (isMounted) {
          setColleagues(data);
        }
      } catch (err) {
        toastError(err);
      } finally {
        if (isMounted) setLoadingColleagues(false);
      }
    };
    loadColleagues();
    return () => {
      isMounted = false;
    };
  }, []);

  // Carregar histórico de mensagens ao selecionar colega
  useEffect(() => {
    if (!selectedColleague) return;

    let isMounted = true;
    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        const { data } = await api.get(`/internal-chat/${selectedColleague.id}`);
        if (isMounted) {
          setMessages(data.messages || []);
          setTimeout(scrollToBottom, 100);
        }

        // Marcar mensagens como lidas
        if (selectedColleague.unreadCount > 0) {
          await api.put(`/internal-chat/read/${selectedColleague.id}`);
          setColleagues((prev) =>
            prev.map((c) =>
              c.id === selectedColleague.id ? { ...c, unreadCount: 0 } : c
            )
          );
        }
      } catch (err) {
        toastError(err);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [selectedColleague]);

  // Socket.IO para mensagens em tempo real isoladas por empresa
  useEffect(() => {
    if (!user || !user.companyId) return;

    const socket = openSocket();
    const eventName = `company-${user.companyId}-internal-chat`;

    socket.on(eventName, (data) => {
      if (
        (data.action === "newMessage" || data.action === "new-message") &&
        data.message
      ) {
        const msg = data.message;

        // Se for a conversa aberta atualmente
        if (
          selectedColleague &&
          (msg.senderId === selectedColleague.id ||
            msg.receiverId === selectedColleague.id)
        ) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          setTimeout(scrollToBottom, 100);

          // Se recebida na conversa aberta, marcar como lida
          if (msg.senderId === selectedColleague.id) {
            api.put(`/internal-chat/read/${selectedColleague.id}`).catch(() => {});
          }
        }

        // Atualizar lista de colegas (última mensagem e contagem)
        setColleagues((prev) => {
          return prev.map((c) => {
            const isPartner = c.id === msg.senderId || c.id === msg.receiverId;
            if (!isPartner) return c;

            const isCurrentOpen = selectedColleague && selectedColleague.id === c.id;
            const newUnread =
              msg.senderId === c.id && !isCurrentOpen
                ? (c.unreadCount || 0) + 1
                : isCurrentOpen
                ? 0
                : c.unreadCount;

            return {
              ...c,
              lastMessage: msg,
              unreadCount: newUnread,
            };
          });
        });
      }

      if (data.action === "readMessages" || data.action === "read-messages") {
        const { targetUserId } = data;
        if (selectedColleague && selectedColleague.id === targetUserId) {
          setMessages((prev) =>
            prev.map((m) => (m.senderId === user.id ? { ...m, read: true, isRead: true } : m))
          );
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user, selectedColleague]);

  // Envio de nova mensagem interna
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedColleague || sending) return;

    try {
      setSending(true);
      const { data } = await api.post("/internal-chat", {
        receiverId: selectedColleague.id,
        text: inputText.trim(),
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });

      // Atualizar lista lateral
      setColleagues((prev) =>
        prev.map((c) =>
          c.id === selectedColleague.id ? { ...c, lastMessage: data } : c
        )
      );

      setInputText("");
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      toastError(err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredColleagues = colleagues.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className={classes.root}>
      <Grid container className={classes.container}>
        {/* Painel Esquerdo: Lista de Colegas da Empresa */}
        <Grid item xs={12} md={4} className={classes.sidebar}>
          <div className={classes.sidebarHeader}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h6" style={{ fontWeight: 600 }}>
                {i18n.t("internalChat.title")}
              </Typography>
              <Chip
                icon={<LockOutlinedIcon style={{ fontSize: 14 }} />}
                label="Equipe"
                size="small"
                variant="outlined"
              />
            </Box>
            <TextField
              className={classes.searchField}
              placeholder={i18n.t("internalChat.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="outlined"
              size="small"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </div>

          <List className={classes.colleaguesList}>
            {loadingColleagues ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress size={28} />
              </Box>
            ) : filteredColleagues.length === 0 ? (
              <Box p={3} textAlign="center" color="text.secondary">
                <Typography variant="body2">Nenhum colega encontrado.</Typography>
              </Box>
            ) : (
              filteredColleagues.map((colleague) => {
                const isSelected =
                  selectedColleague && selectedColleague.id === colleague.id;
                return (
                  <ListItem
                    key={colleague.id}
                    button
                    selected={isSelected}
                    onClick={() => setSelectedColleague(colleague)}
                    className={classes.colleagueItem}
                  >
                    <ListItemAvatar>
                      <Badge
                        color="secondary"
                        badgeContent={colleague.unreadCount}
                        invisible={!colleague.unreadCount || colleague.unreadCount === 0}
                        className={classes.unreadBadge}
                      >
                        <Avatar>
                          {colleague.name ? colleague.name.charAt(0).toUpperCase() : "U"}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center">
                          <Typography variant="subtitle2" noWrap style={{ fontWeight: 600 }}>
                            {colleague.name}
                          </Typography>
                          <Chip
                            label={getRoleLabel(colleague.profile)}
                            size="small"
                            className={classes.roleChip}
                            color={
                              colleague.profile === "admin" || colleague.profile === "superadmin"
                                ? "primary"
                                : "default"
                            }
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="textSecondary" noWrap display="block">
                          {colleague.lastMessage
                            ? colleague.lastMessage.text
                            : colleague.email || "Sem mensagens"}
                        </Typography>
                      }
                    />
                  </ListItem>
                );
              })
            )}
          </List>
        </Grid>

        {/* Painel Direito: Janela de Conversa Ativa */}
        <Grid item xs={12} md={8} className={classes.chatArea}>
          {selectedColleague ? (
            <>
              {/* Topo do Chat */}
              <div className={classes.chatHeader}>
                <div className={classes.chatHeaderLeft}>
                  <Avatar>
                    {selectedColleague.name ? selectedColleague.name.charAt(0).toUpperCase() : "U"}
                  </Avatar>
                  <div>
                    <Box display="flex" alignItems="center">
                      <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
                        {selectedColleague.name}
                      </Typography>
                      <Chip
                        label={getRoleLabel(selectedColleague.profile)}
                        size="small"
                        className={classes.roleChip}
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      {selectedColleague.email}
                    </Typography>
                  </div>
                </div>
                <Chip
                  icon={<LockOutlinedIcon style={{ fontSize: 14, color: "#2e7d32" }} />}
                  label="Canal Interno Exclusivo"
                  size="small"
                  className={classes.securityChip}
                />
              </div>

              {/* Área de Mensagens */}
              <div className={classes.messagesArea}>
                {loadingMessages ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <CircularProgress size={32} />
                  </Box>
                ) : messages.length === 0 ? (
                  <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
                    <ForumIcon style={{ fontSize: 48, color: "#bbb", marginBottom: 8 }} />
                    <Typography variant="body2" color="textSecondary">
                      {i18n.t("internalChat.emptyMessages")}
                    </Typography>
                  </Box>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === user.id;
                    return (
                      <div
                        key={msg.id}
                        className={`${classes.messageBubble} ${
                          isMe ? classes.messageSent : classes.messageReceived
                        }`}
                      >
                        <Typography variant="body2" style={{ whiteSpace: "pre-wrap" }}>
                          {msg.text}
                        </Typography>
                        <div className={classes.messageMeta}>
                          <span>
                            {msg.createdAt
                              ? format(parseISO(msg.createdAt), "HH:mm", { locale: ptBR })
                              : ""}
                          </span>
                          {isMe &&
                            (msg.isRead ? (
                              <DoneAllIcon style={{ fontSize: 13, color: "#81c784" }} />
                            ) : (
                              <DoneIcon style={{ fontSize: 13 }} />
                            ))}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Rodapé de Informação de Segurança */}
              <div className={classes.securityNoticeFooter}>
                <LockOutlinedIcon style={{ fontSize: 12 }} />
                <span>{i18n.t("internalChat.securityNotice")}</span>
              </div>

              {/* Campo de Envio de Mensagem */}
              <form onSubmit={handleSendMessage} className={classes.inputArea}>
                <TextField
                  className={classes.inputField}
                  placeholder={i18n.t("internalChat.inputPlaceholder")}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  variant="outlined"
                  size="small"
                  multiline
                  maxRows={3}
                />
                <IconButton
                  color="primary"
                  type="submit"
                  disabled={!inputText.trim() || sending}
                >
                  <SendIcon />
                </IconButton>
              </form>
            </>
          ) : (
            <div className={classes.emptyChat}>
              <ForumIcon className={classes.emptyChatIcon} />
              <Typography variant="h6" gutterBottom>
                {i18n.t("internalChat.title")}
              </Typography>
              <Typography variant="body2" color="textSecondary" style={{ maxWidth: 400 }}>
                {i18n.t("internalChat.selectColleague")}
              </Typography>
              <Box mt={2} display="flex" alignItems="center" color="text.secondary">
                <LockOutlinedIcon fontSize="small" style={{ marginRight: 4 }} />
                <Typography variant="caption">
                  {i18n.t("internalChat.securityNotice")}
                </Typography>
              </Box>
            </div>
          )}
        </Grid>
      </Grid>
    </div>
  );
};

export default InternalChat;

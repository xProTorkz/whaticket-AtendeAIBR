import React, { useState, useEffect, useContext, useCallback } from "react";
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import Board from "react-trello";
import { toast } from "react-toastify";
import { i18n } from "../../translate/i18n";
import { useHistory } from "react-router-dom";
import { socketConnection } from "../../services/socket";

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(1),
  },
  button: {
    background: "#10a110",
    border: "none",
    padding: "10px",
    color: "white",
    fontWeight: "bold",
    borderRadius: "5px",
    cursor: "pointer",
  },
}));

const Kanban = () => {
  const classes = useStyles();
  const history = useHistory();
  const { user } = useContext(AuthContext);

  const [tags, setTags] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [file, setFile] = useState({ lanes: [] });

  const queueIds = user?.queues?.map(queue => queue?.UserQueue?.queueId || queue?.id) || [];

  const fetchTickets = useCallback(async (qIds = queueIds) => {
    try {
      const { data } = await api.get("/ticket/kanban", {
        params: {
          queueIds: JSON.stringify(qIds),
          teste: true
        }
      });
      setTickets(data.tickets || []);
    } catch (err) {
      console.log(err);
      setTickets([]);
    }
  }, [queueIds]);

  const fetchTags = useCallback(async () => {
    try {
      const response = await api.get("/tags/kanban");
      const fetchedTags = response.data.lista || [];
      setTags(fetchedTags);
      await fetchTickets(queueIds);
    } catch (error) {
      console.log(error);
    }
  }, [fetchTickets, queueIds]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Realtime updates
  useEffect(() => {
    if (!user?.companyId) return;
    const socket = socketConnection({ companyId: user.companyId });

    socket.on(`company-${user.companyId}-ticket`, () => {
      fetchTickets(queueIds);
    });

    socket.on(`company-${user.companyId}-tag`, () => {
      fetchTags();
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.companyId, queueIds, fetchTickets, fetchTags]);

  const handleCardClick = (uuid) => {
    history.push("/tickets/" + uuid);
  };

  const popularCards = useCallback(() => {
    const filteredTickets = tickets.filter(ticket => !ticket.tags || ticket.tags.length === 0);

    const lanes = [
      {
        id: "lane0",
        title: i18n.t("Em aberto"),
        label: String(filteredTickets.length),
        cards: filteredTickets.map(ticket => ({
          id: ticket.id.toString(),
          label: "Ticket nº " + ticket.id.toString(),
          description: (
            <div>
              <p>
                {ticket.contact?.number}
                <br />
                {ticket.lastMessage}
              </p>
              <button
                className={classes.button}
                onClick={() => handleCardClick(ticket.uuid)}
              >
                Ver Ticket
              </button>
            </div>
          ),
          title: ticket.contact?.name || "Sem Nome",
          draggable: true,
          href: "/tickets/" + ticket.uuid,
        })),
      },
      ...tags.map(tag => {
        const tagTickets = tickets.filter(ticket => {
          const tagIds = ticket.tags ? ticket.tags.map(t => t.id) : [];
          return tagIds.includes(tag.id);
        });

        return {
          id: tag.id.toString(),
          title: tag.name,
          label: String(tagTickets.length),
          cards: tagTickets.map(ticket => ({
            id: ticket.id.toString(),
            label: "Ticket nº " + ticket.id.toString(),
            description: (
              <div>
                <p>
                  {ticket.contact?.number}
                  <br />
                  {ticket.lastMessage}
                </p>
                <button
                  className={classes.button}
                  onClick={() => handleCardClick(ticket.uuid)}
                >
                  Ver Ticket
                </button>
              </div>
            ),
            title: ticket.contact?.name || "Sem Nome",
            draggable: true,
            href: "/tickets/" + ticket.uuid,
          })),
          style: { backgroundColor: tag.color, color: "white" }
        };
      }),
    ];

    setFile({ lanes });
  }, [tickets, tags, classes.button]);

  useEffect(() => {
    popularCards();
  }, [popularCards]);

  const handleCardMove = async (fromLaneId, toLaneId, cardId, index) => {
    try {
      await api.delete(`/ticket-tags/${cardId}`);
      if (toLaneId && toLaneId !== "lane0") {
        await api.put(`/ticket-tags/${cardId}/${toLaneId}`);
        toast.success("Ticket Tag atualizado com sucesso!");
      } else {
        toast.success("Ticket movido para Em Aberto!");
      }
      await fetchTickets(queueIds);
    } catch (err) {
      console.log(err);
      toast.error("Erro ao mover ticket entre colunas");
    }
  };

  return (
    <div className={classes.root}>
      <Board
        data={file}
        onCardMoveAcrossLanes={handleCardMove}
        style={{ backgroundColor: "rgba(252, 252, 252, 0.03)" }}
      />
    </div>
  );
};

export default Kanban;

import { subHours } from "date-fns";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";
import CreateTicketLifecycleEventService from "./CreateTicketLifecycleEventService";

const FindOrCreateTicketService = async (
  contact: Contact,
  whatsappId: number,
  unreadMessages: number,
  groupContact?: Contact,
  companyId: number = 1
): Promise<Ticket> => {
  const effectiveCompanyId = contact.companyId || companyId;

  let ticket = await Ticket.findOne({
    where: {
      status: {
        [Op.or]: ["open", "pending"]
      },
      contactId: groupContact ? groupContact.id : contact.id,
      whatsappId: whatsappId,
      companyId: effectiveCompanyId
    }
  });

  if (ticket) {
    await ticket.update({ unreadMessages });
  }

  if (!ticket && groupContact) {
    ticket = await Ticket.findOne({
      where: {
        contactId: groupContact.id,
        whatsappId: whatsappId,
        companyId: effectiveCompanyId
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages,
        queueEnteredAt: new Date(),
        startedAt: null,
        firstResponseAt: null,
        closedAt: null
      });

      await CreateTicketLifecycleEventService({
        ticketId: ticket.id,
        companyId: effectiveCompanyId,
        type: "reopened",
        details: "Reaberto por mensagem de grupo"
      });
      await CreateTicketLifecycleEventService({
        ticketId: ticket.id,
        companyId: effectiveCompanyId,
        type: "queue_entered",
        queueId: ticket.queueId
      });
    }
  }

  if (!ticket && !groupContact) {
    ticket = await Ticket.findOne({
      where: {
        updatedAt: {
          [Op.between]: [+subHours(new Date(), 2), +new Date()]
        },
        contactId: contact.id,
        whatsappId: whatsappId,
        companyId: effectiveCompanyId
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages,
        queueEnteredAt: new Date(),
        startedAt: null,
        firstResponseAt: null,
        closedAt: null
      });

      await CreateTicketLifecycleEventService({
        ticketId: ticket.id,
        companyId: effectiveCompanyId,
        type: "reopened",
        details: "Reaberto por mensagem do contato"
      });
      await CreateTicketLifecycleEventService({
        ticketId: ticket.id,
        companyId: effectiveCompanyId,
        type: "queue_entered",
        queueId: ticket.queueId
      });
    }
  }

  if (!ticket) {
    const now = new Date();
    ticket = await Ticket.create({
      contactId: groupContact ? groupContact.id : contact.id,
      status: "pending",
      isGroup: !!groupContact,
      unreadMessages,
      whatsappId,
      queueEnteredAt: now,
      companyId: effectiveCompanyId
    });

    await CreateTicketLifecycleEventService({
      ticketId: ticket.id,
      companyId: effectiveCompanyId,
      type: "queue_entered",
      queueId: ticket.queueId,
      details: "Ticket criado por mensagem inbound"
    });
  }

  ticket = await ShowTicketService(ticket.id, effectiveCompanyId);

  return ticket;
};

export default FindOrCreateTicketService;

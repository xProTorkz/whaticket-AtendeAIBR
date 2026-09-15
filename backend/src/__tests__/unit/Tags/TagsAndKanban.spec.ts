import { truncate, disconnect } from "../../utils/database";
import Tag from "../../../models/Tag";
import Ticket from "../../../models/Ticket";
import Contact from "../../../models/Contact";
import TicketTag from "../../../models/TicketTag";
import ContactTag from "../../../models/ContactTag";

describe("Tags and Kanban Persistence (Issue #14)", () => {
  beforeEach(async () => {
    await truncate();
  });

  afterAll(async () => {
    await disconnect();
  });

  it("should create tags with kanban flag, color and order", async () => {
    const tag1 = await Tag.create({
      name: "Em Atendimento",
      color: "#3498db",
      kanban: 1,
      order: 0,
      companyId: 1
    });

    const tag2 = await Tag.create({
      name: "Aguardando Pagamento",
      color: "#e67e22",
      kanban: 1,
      order: 1,
      companyId: 1
    });

    const tagInternal = await Tag.create({
      name: "Interna VIP",
      color: "#9b59b6",
      kanban: 0,
      order: 2,
      companyId: 1
    });

    expect(tag1.id).toBeDefined();
    expect(tag2.id).toBeDefined();
    expect(tagInternal.id).toBeDefined();

    const kanbanTags = await Tag.findAll({
      where: { companyId: 1, kanban: 1 },
      order: [["order", "ASC"]]
    });

    expect(kanbanTags.length).toBe(2);
    expect(kanbanTags[0].name).toBe("Em Atendimento");
    expect(kanbanTags[1].name).toBe("Aguardando Pagamento");
  });

  it("should associate tags with tickets and contacts via junction tables", async () => {
    const contact = await Contact.create({
      name: "Contato Tag Teste",
      number: "5511988887777",
      companyId: 1
    });

    const ticket = await Ticket.create({
      contactId: contact.id,
      status: "open",
      companyId: 1,
      lastMessage: "Olá!"
    });

    const tag = await Tag.create({
      name: "Prioridade Alta",
      color: "#e74c3c",
      kanban: 1,
      companyId: 1
    });

    // Associar TicketTag
    await TicketTag.create({
      ticketId: ticket.id,
      tagId: tag.id
    });

    // Associar ContactTag
    await ContactTag.create({
      contactId: contact.id,
      tagId: tag.id
    });

    const ticketWithTags = await Ticket.findByPk(ticket.id, {
      include: [{ model: Tag, as: "tags" }]
    });

    expect(ticketWithTags?.tags.length).toBe(1);
    expect(ticketWithTags?.tags[0].name).toBe("Prioridade Alta");

    const contactWithTags = await Contact.findByPk(contact.id, {
      include: [{ model: Tag, as: "tags" }]
    });

    expect(contactWithTags?.tags.length).toBe(1);
    expect(contactWithTags?.tags[0].name).toBe("Prioridade Alta");
  });

  it("should remove tag association when ticket is moved or unlinked", async () => {
    const contact = await Contact.create({
      name: "Contato Unlink",
      number: "5511977776666",
      companyId: 1
    });

    const ticket = await Ticket.create({
      contactId: contact.id,
      status: "open",
      companyId: 1
    });

    const tagA = await Tag.create({ name: "Etapa 1", color: "#111", kanban: 1, companyId: 1 });
    const tagB = await Tag.create({ name: "Etapa 2", color: "#222", kanban: 1, companyId: 1 });

    await TicketTag.create({ ticketId: ticket.id, tagId: tagA.id });

    // Desvincular e mover para Etapa 2
    await TicketTag.destroy({ where: { ticketId: ticket.id } });
    await TicketTag.create({ ticketId: ticket.id, tagId: tagB.id });

    const ticketUpdated = await Ticket.findByPk(ticket.id, {
      include: [{ model: Tag, as: "tags" }]
    });

    expect(ticketUpdated?.tags.length).toBe(1);
    expect(ticketUpdated?.tags[0].id).toBe(tagB.id);
  });
});

import { truncate, disconnect } from "../../utils/database";
import Pipeline from "../../../models/Pipeline";
import PipelineStage from "../../../models/PipelineStage";
import Deal from "../../../models/Deal";
import DealTimeline from "../../../models/DealTimeline";
import CrmConfig from "../../../models/CrmConfig";
import Contact from "../../../models/Contact";

describe("CRM Pipelines, Deals and Retention (Issue #14)", () => {
  beforeEach(async () => {
    await truncate();
  });

  afterAll(async () => {
    await disconnect();
  });

  it("should create a pipeline with ordered stages and associate them", async () => {
    const pipeline = await Pipeline.create({
      name: "Funil Comercial",
      order: 0,
      companyId: 1
    });

    expect(pipeline.id).toBeDefined();
    expect(pipeline.name).toBe("Funil Comercial");

    const stage1 = await PipelineStage.create({
      pipelineId: pipeline.id,
      name: "Qualificação",
      color: "#3498db",
      order: 0,
      companyId: 1
    });

    const stage2 = await PipelineStage.create({
      pipelineId: pipeline.id,
      name: "Proposta",
      color: "#2ecc71",
      order: 1,
      companyId: 1
    });

    const foundPipeline = await Pipeline.findByPk(pipeline.id, {
      include: [{ model: PipelineStage, as: "stages" }]
    });

    expect(foundPipeline).not.toBeNull();
    expect(foundPipeline?.stages.length).toBe(2);
    expect(foundPipeline?.stages[0].name).toBe("Qualificação");
    expect(foundPipeline?.stages[1].name).toBe("Proposta");
  });

  it("should create a deal and record initial timeline event", async () => {
    const contact = await Contact.create({
      name: "Cliente CRM Teste",
      number: "5511999998888",
      companyId: 1
    });

    const pipeline = await Pipeline.create({
      name: "Funil Vendas",
      order: 0,
      companyId: 1
    });

    const stage = await PipelineStage.create({
      pipelineId: pipeline.id,
      name: "Etapa Inicial",
      color: "#f1c40f",
      order: 0,
      companyId: 1
    });

    const deal = await Deal.create({
      name: "Venda de Software",
      value: 3500.0,
      priority: "high",
      status: "open",
      contactId: contact.id,
      pipelineId: pipeline.id,
      stageId: stage.id,
      companyId: 1
    });

    expect(deal.id).toBeDefined();
    expect(Number(deal.value)).toBe(3500.0);

    const timeline = await DealTimeline.create({
      dealId: deal.id,
      companyId: 1,
      action: "created",
      description: "Oportunidade criada no valor de R$ 3500.00",
      newValue: "3500.00"
    });

    expect(timeline.id).toBeDefined();
    expect(timeline.action).toBe("created");

    const dealHistory = await DealTimeline.findAll({
      where: { dealId: deal.id }
    });

    expect(dealHistory.length).toBe(1);
    expect(dealHistory[0].description).toContain("3500.00");
  });

  it("should record stage change and update deal stage", async () => {
    const pipeline = await Pipeline.create({
      name: "Pipeline Suporte",
      order: 0,
      companyId: 1
    });

    const stageA = await PipelineStage.create({
      pipelineId: pipeline.id,
      name: "Aberto",
      color: "#e74c3c",
      order: 0,
      companyId: 1
    });

    const stageB = await PipelineStage.create({
      pipelineId: pipeline.id,
      name: "Ganha",
      color: "#2ecc71",
      order: 1,
      companyId: 1
    });

    const deal = await Deal.create({
      name: "Serviço Consultoria",
      value: 1200.0,
      status: "open",
      pipelineId: pipeline.id,
      stageId: stageA.id,
      companyId: 1
    });

    // Mover estágio
    await deal.update({ stageId: stageB.id, status: "won" });

    await DealTimeline.create({
      dealId: deal.id,
      companyId: 1,
      action: "stage_change",
      description: `Estágio alterado de ${stageA.name} para ${stageB.name}`,
      oldValue: String(stageA.id),
      newValue: String(stageB.id)
    });

    const updatedDeal = await Deal.findByPk(deal.id, {
      include: [{ model: PipelineStage, as: "stage" }]
    });

    expect(updatedDeal?.stageId).toBe(stageB.id);
    expect(updatedDeal?.stage.name).toBe("Ganha");

    const timelines = await DealTimeline.findAll({
      where: { dealId: deal.id, action: "stage_change" }
    });

    expect(timelines.length).toBe(1);
    expect(timelines[0].description).toContain("Aberto para Ganha");
  });

  it("should persist and retrieve company CRM retention config", async () => {
    const config = await CrmConfig.create({
      companyId: 1,
      diasClienteSumido: 45,
      horarioEnvio: "10:30",
      mensagemAniversario: "Parabéns {nome}! Ganhe um cupom!",
      mensagemSumido: "Olá {nome}, tudo bem? Sentimos sua falta!",
      autoEnvioAtivo: true
    });

    expect(config.id).toBeDefined();

    const retrieved = await CrmConfig.findOne({ where: { companyId: 1 } });
    expect(retrieved).not.toBeNull();
    expect(retrieved?.diasClienteSumido).toBe(45);
    expect(retrieved?.autoEnvioAtivo).toBe(true);
    expect(retrieved?.horarioEnvio).toBe("10:30");
  });
});

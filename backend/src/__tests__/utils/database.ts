import database from "../../database";
import Company from "../../models/Company";

const truncate = async (): Promise<void> => {
  try {
    await database.query("SET FOREIGN_KEY_CHECKS = 0;");
    const [tables]: any = await database.query("SHOW TABLES;");
    for (const tableObj of tables) {
      const tableName = Object.values(tableObj)[0];
      if (tableName !== "SequelizeMeta" && tableName !== "SequelizeData") {
        await database.query(`DELETE FROM \`${tableName}\`;`);
      }
    }
    await database.query("SET FOREIGN_KEY_CHECKS = 1;");
    const Plan = (await import("../../models/Plan")).default;
    await Plan.findOrCreate({
      where: { id: 1 },
      defaults: {
        id: 1,
        name: "Start",
        description: "Plano Start",
        maxUsers: 3,
        maxConnections: 1,
        maxContacts: 1000,
        maxCampaigns: 2,
        capabilities: {
          crm: true,
          kanban: true,
          campaigns: true,
          schedules: true,
          internalChat: true,
          apiIntegrations: false,
          customBranding: false,
          ai: false
        },
        price: 9900
      }
    });
    await Plan.findOrCreate({
      where: { id: 2 },
      defaults: {
        id: 2,
        name: "Pro",
        description: "Plano Pro",
        maxUsers: 10,
        maxConnections: 3,
        maxContacts: 10000,
        maxCampaigns: 20,
        capabilities: {
          crm: true,
          kanban: true,
          campaigns: true,
          schedules: true,
          internalChat: true,
          apiIntegrations: true,
          customBranding: true,
          ai: true
        },
        price: 24900
      }
    });
    await Company.findOrCreate({
      where: { id: 1 },
      defaults: { id: 1, name: "Empresa Padrão", plan: "default", planId: 1, status: true }
    });
  } catch (err) {
    await database.query("SET FOREIGN_KEY_CHECKS = 1;");
    throw err;
  }
};

const disconnect = async (): Promise<void> => {
  return database.connectionManager.close();
};

export { truncate, disconnect };

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
    await Company.findOrCreate({
      where: { id: 1 },
      defaults: { id: 1, name: "Empresa Padrão", plan: "default", status: true }
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

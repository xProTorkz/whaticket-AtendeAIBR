import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Tickets", "channel", {
      type: DataTypes.STRING,
      defaultValue: "whatsapp",
      allowNull: false
    });

    await queryInterface.addColumn("Messages", "channel", {
      type: DataTypes.STRING,
      defaultValue: "whatsapp",
      allowNull: false
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "channel");
    await queryInterface.removeColumn("Messages", "channel");
  }
};

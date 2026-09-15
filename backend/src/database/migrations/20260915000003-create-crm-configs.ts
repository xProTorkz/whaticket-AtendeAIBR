import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("CrmConfigs", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        defaultValue: 1,
        allowNull: false
      },
      diasClienteSumido: {
        type: DataTypes.INTEGER,
        defaultValue: 15,
        allowNull: false
      },
      horarioEnvio: {
        type: DataTypes.STRING,
        defaultValue: "09:00",
        allowNull: false
      },
      mensagemAniversario: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      mensagemSumido: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      autoEnvioAtivo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("CrmConfigs");
  }
};

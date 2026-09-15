import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // 1. Adicionar colunas de tracking na tabela Tickets
    await queryInterface.addColumn("Tickets", "queueEnteredAt", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn("Tickets", "startedAt", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn("Tickets", "firstResponseAt", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn("Tickets", "closedAt", {
      type: DataTypes.DATE,
      allowNull: true
    });

    // 2. Adicionar SLA na tabela Queues (em minutos)
    await queryInterface.addColumn("Queues", "sla", {
      type: DataTypes.INTEGER,
      defaultValue: 15,
      allowNull: false
    });

    // 3. Tabela TicketLifecycleEvents (Histórico imutável de eventos do ciclo de vida)
    await queryInterface.createTable("TicketLifecycleEvents", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      ticketId: {
        type: DataTypes.INTEGER,
        references: { model: "Tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
      userId: {
        type: DataTypes.INTEGER,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        allowNull: true
      },
      queueId: {
        type: DataTypes.INTEGER,
        references: { model: "Queues", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        allowNull: true
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      previousUserId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      previousQueueId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      waitDurationSeconds: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      supportDurationSeconds: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      details: {
        type: DataTypes.TEXT,
        allowNull: true
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

    await queryInterface.addIndex("TicketLifecycleEvents", ["ticketId"]);
    await queryInterface.addIndex("TicketLifecycleEvents", ["companyId"]);
    await queryInterface.addIndex("TicketLifecycleEvents", ["type"]);
    await queryInterface.addIndex("TicketLifecycleEvents", ["createdAt"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("TicketLifecycleEvents");
    await queryInterface.removeColumn("Queues", "sla");
    await queryInterface.removeColumn("Tickets", "closedAt");
    await queryInterface.removeColumn("Tickets", "firstResponseAt");
    await queryInterface.removeColumn("Tickets", "startedAt");
    await queryInterface.removeColumn("Tickets", "queueEnteredAt");
  }
};

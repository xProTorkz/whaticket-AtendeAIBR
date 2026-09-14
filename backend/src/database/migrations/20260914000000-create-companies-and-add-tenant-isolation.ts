import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // 1. Criar tabela Companies
    await queryInterface.createTable("Companies", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      plan: {
        type: DataTypes.STRING,
        defaultValue: "default"
      },
      dueDate: {
        type: DataTypes.STRING,
        allowNull: true
      },
      recurrence: {
        type: DataTypes.STRING,
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

    // 2. Inserir empresa inicial padrão (id: 1) para preservar dados atuais
    await queryInterface.bulkInsert("Companies", [
      {
        id: 1,
        name: "Empresa Padrão",
        status: true,
        plan: "default",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // 3. Adicionar companyId nas tabelas de recursos
    const tablesWithTenant = [
      "Users",
      "Contacts",
      "Tickets",
      "Messages",
      "Queues",
      "Whatsapps",
      "QuickAnswers",
      "Settings"
    ];

    for (const tableName of tablesWithTenant) {
      await queryInterface.addColumn(tableName, "companyId", {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        references: {
          model: "Companies",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      });

      // Criar índice de busca para isolamento eficiente por tenant
      await queryInterface.addIndex(tableName, ["companyId"]);
    }

    // 4. Adicionar flag isSuperAdmin na tabela Users
    await queryInterface.addColumn("Users", "isSuperAdmin", {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    // 5. Criar tabela AuditLogs para auditoria mínima administrativa
    await queryInterface.createTable("AuditLogs", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        references: {
          model: "Companies",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false
      },
      entity: {
        type: DataTypes.STRING,
        allowNull: false
      },
      entityId: {
        type: DataTypes.STRING,
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

    await queryInterface.addIndex("AuditLogs", ["companyId", "createdAt"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("AuditLogs");

    const tablesWithTenant = [
      "Users",
      "Contacts",
      "Tickets",
      "Messages",
      "Queues",
      "Whatsapps",
      "QuickAnswers",
      "Settings"
    ];

    for (const tableName of tablesWithTenant) {
      await queryInterface.removeColumn(tableName, "companyId");
    }

    await queryInterface.removeColumn("Users", "isSuperAdmin");

    await queryInterface.dropTable("Companies");
  }
};

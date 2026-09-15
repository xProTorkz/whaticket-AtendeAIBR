import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // 1. Adicionar coluna optOut na tabela Contacts
    await queryInterface.addColumn("Contacts", "optOut", {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    // 2. Tabela Schedules (Agendamentos individuais)
    await queryInterface.createTable("Schedules", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      sendAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      sentAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      contactId: {
        type: DataTypes.INTEGER,
        references: { model: "Contacts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      userId: {
        type: DataTypes.INTEGER,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        allowNull: true
      },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        defaultValue: 1,
        allowNull: false
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "PENDENTE",
        allowNull: false
      },
      mediaPath: {
        type: DataTypes.STRING,
        allowNull: true
      },
      mediaName: {
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

    await queryInterface.addIndex("Schedules", ["companyId", "status"]);
    await queryInterface.addIndex("Schedules", ["companyId", "sendAt"]);
    await queryInterface.addIndex("Schedules", ["contactId"]);

    // 3. Tabela ContactLists (Listas de Contatos)
    await queryInterface.createTable("ContactLists", {
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
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        defaultValue: 1,
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

    await queryInterface.addIndex("ContactLists", ["companyId", "name"]);

    // 4. Tabela ContactListItems (Itens da Lista de Contatos)
    await queryInterface.createTable("ContactListItems", {
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
      number: {
        type: DataTypes.STRING,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true
      },
      contactListId: {
        type: DataTypes.INTEGER,
        references: { model: "ContactLists", key: "id" },
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
      isWhatsappValid: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      optOut: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
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

    await queryInterface.addIndex("ContactListItems", ["contactListId"]);
    await queryInterface.addIndex("ContactListItems", ["companyId", "number"]);

    // 5. Tabela Campaigns (Campanhas de Disparo)
    await queryInterface.createTable("Campaigns", {
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
        type: DataTypes.STRING,
        defaultValue: "INATIVA",
        allowNull: false
      },
      confirmation: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      scheduledAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      message1: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      message2: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      message3: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      message4: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      message5: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      confirmationMessage1: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      confirmationMessage2: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      confirmationMessage3: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      confirmationMessage4: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      confirmationMessage5: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      whatsappId: {
        type: DataTypes.INTEGER,
        references: { model: "Whatsapps", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        allowNull: true
      },
      contactListId: {
        type: DataTypes.INTEGER,
        references: { model: "ContactLists", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        allowNull: true
      },
      tagListId: {
        type: DataTypes.STRING,
        allowNull: true
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
      mediaPath: {
        type: DataTypes.STRING,
        allowNull: true
      },
      mediaName: {
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

    await queryInterface.addIndex("Campaigns", ["companyId", "status"]);
    await queryInterface.addIndex("Campaigns", ["companyId", "scheduledAt"]);

    // 6. Tabela CampaignShippings (Disparos Individuais de Campanha)
    await queryInterface.createTable("CampaignShippings", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      campaignId: {
        type: DataTypes.INTEGER,
        references: { model: "Campaigns", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      contactListItemId: {
        type: DataTypes.INTEGER,
        references: { model: "ContactListItems", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        allowNull: true
      },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        defaultValue: 1,
        allowNull: false
      },
      jobId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      number: {
        type: DataTypes.STRING,
        allowNull: false
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "pending",
        allowNull: false
      },
      deliveredAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      confirmationRequestedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      confirmedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      error: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      retries: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
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

    await queryInterface.addIndex("CampaignShippings", ["campaignId", "status"]);
    await queryInterface.addIndex("CampaignShippings", ["companyId", "jobId"]);

    // 7. Tabela CampaignSettings (Configurações de cadência e variáveis de campanha)
    await queryInterface.createTable("CampaignSettings", {
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
      key: {
        type: DataTypes.STRING,
        allowNull: false
      },
      value: {
        type: DataTypes.TEXT,
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

    await queryInterface.addIndex("CampaignSettings", ["companyId", "key"], {
      unique: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("CampaignSettings");
    await queryInterface.dropTable("CampaignShippings");
    await queryInterface.dropTable("Campaigns");
    await queryInterface.dropTable("ContactListItems");
    await queryInterface.dropTable("ContactLists");
    await queryInterface.dropTable("Schedules");
    await queryInterface.removeColumn("Contacts", "optOut");
  }
};

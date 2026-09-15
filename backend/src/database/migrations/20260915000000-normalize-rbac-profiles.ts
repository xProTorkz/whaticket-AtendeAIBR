import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      "UPDATE Users SET profile = 'admin', isSuperAdmin = 1 WHERE profile = 'superadmin'"
    );

    await queryInterface.sequelize.query(
      "UPDATE Users SET profile = 'manager' WHERE profile = 'supervisor'"
    );

    await queryInterface.sequelize.query(
      "UPDATE Users SET profile = 'agent' WHERE profile = 'user'"
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      "UPDATE Users SET profile = 'user' WHERE profile = 'agent'"
    );
    await queryInterface.sequelize.query(
      "UPDATE Users SET profile = 'supervisor' WHERE profile = 'manager'"
    );
  }
};

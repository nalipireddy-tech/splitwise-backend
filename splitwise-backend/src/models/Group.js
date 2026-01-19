const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define("Group", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });
};

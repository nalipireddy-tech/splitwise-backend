const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define("Balance", {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    owesTo: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
  });
};

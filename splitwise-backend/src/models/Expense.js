const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define("Expense", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
    },
  });
};

module.exports = (sequelize, DataTypes) => {
  return sequelize.define("ExpenseSplit", {
    amount: DataTypes.FLOAT
  });
};

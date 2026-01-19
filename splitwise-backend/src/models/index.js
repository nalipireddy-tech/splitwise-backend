const sequelize = require("../config/db");

const User = require("./User")(sequelize);
const Group = require("./Group")(sequelize);
const Expense = require("./Expense")(sequelize);
const Balance = require("./Balance")(sequelize);

// associations
Balance.belongsTo(User, { foreignKey: "owesTo", as: "owesToUser" });

module.exports = {
  sequelize,
  User,
  Group,
  Expense,
  Balance,
};

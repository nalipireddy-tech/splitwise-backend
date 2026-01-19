const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "postgres",
    logging: false,
  }
);

const initDb = async () => {
  try {
    await sequelize.authenticate();
    console.log("DB Connected");

    await sequelize.sync({ alter: true });
    console.log("DB Synced");
  } catch (err) {
    console.error("DB Init failed, retrying in 3s...");
    setTimeout(initDb, 3000);
  }
};

initDb();

module.exports = sequelize;

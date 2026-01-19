const { Group, User } = require("../models");

exports.createGroup = async (name) => {
  return await Group.create({ name });
};

exports.addUserToGroup = async (groupId, userId) => {
  const group = await Group.findByPk(groupId);
  const user = await User.findByPk(userId);

  if (!group || !user) {
    throw new Error("Group or User not found");
  }

  await group.addUser(user);
};

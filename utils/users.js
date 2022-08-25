const users = [];

// Check User Name
const checkUserName = (room, username, botName) => {
   const users = getRoomUsers(room);
   const nameExists = users.some(el => el.username === username) || botName.includes(username) // true/false for the user already exists
   return nameExists
}

// Join user to chat
const userJoin = (id, username, room) => {
   const user = { id, username, room };

   users.push(user);

   return user;
}

// Get current user
const getCurrentUser = (id) => {
   return users.find(user => user.id === id);
}

// User leaves chat
const userLeave = (id) => {
   const index = users.findIndex(user => user.id === id);

   if (index !== -1) {
      return users.splice(index, 1)[0];
   }
}

// Get room users
const getRoomUsers = (room) => {
   return users.filter(user => user.room === room);
}

export { userJoin, getCurrentUser, userLeave, getRoomUsers, checkUserName };

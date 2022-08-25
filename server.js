import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as http from 'http';
import { Server } from 'socket.io';

import { formatMessage } from './utils/messages.js';
import { userJoin, getCurrentUser, userLeave, getRoomUsers, checkUserName } from './utils/users.js';

// adding variables for __dirname to work with ES module syntaksis
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)      

const botName = 'Chat Pro Bot';

// Server setup
const app = express()
const server = http.createServer(app)
const options = {
   maxHttpBufferSize: 1e8  // 100 Mb
}
let messagesArr = []
let privatMessages = []

// Static files
app.use(express.static(path.join(__dirname, 'client')))

// Socket setup & pass server
const io = new Server(server, options)

// Run on user connect
io.on('connection', socket => {
   socket.on('checkUser', ({ username, room }) => {
 
      socket.join(room);
      // Send username and room to check if name already exists
      io.to(room).emit('checkRoomNames', {
         nameExists: checkUserName(room, username, botName)
      })
   })

   // socket.on('privateMsgsCount', ({ userId }) => {
   //    socket.emit('messages count', {data: privatMessages})
   // })

   socket.on('joinRoom', ({ username, room }) => {
      const user = userJoin(socket.id, username, room)
      
      socket.join(user.room);       // socket.join(room);   /* another but shorter way */
      // Welcome message to a current user
      socket.emit('message', {msg: formatMessage(botName, 'Welcome to Chat Pro!')})

      // Retrieve messages history
      messagesArr.filter(m => m.room === user.room).forEach(m => socket.emit('message', m))

      // Broadcast to room members when a new user connects
      socket.broadcast
         .to(user.room)
         .emit('message', {msg: formatMessage(botName, `${user.username} has joined the chat`)})

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
         room: user.room,
         users: getRoomUsers(user.room),
      });
   })

   // Handle typing event 
   socket.on('typing', ({ data, id }) => {
      if (id) {                  
         socket.broadcast.to(id).emit('typing', data)    // for private messaging
      } else {
         socket.broadcast.emit('typing', data)           // transmitting a typing status to all sockets
      }
   })

   // Handle receiving messages from an array
   socket.on('receiver', ({ receiver, sender, allMsgs }) => {
      const prMessages = privatMessages.filter(el => 
         (el.receiver === receiver && el.sender === sender) || (el.receiver === sender && el.sender === receiver)
      ) 
      if (allMsgs) {
         socket.emit('roomMessages', {messages: [{msg: formatMessage(botName, 'Welcome to Chat Pro!')}, ...messagesArr] })
      } else {
         socket.emit('retrievePrivateMsgs', {messages: [{msg: formatMessage(botName, 'Welcome to Private Chat Pro!')}, ...prMessages]})
      }
   })

   // Listen for chatMessage
   socket.on('chatMessage', ({ msg, receiver, senderName, receiverName, isChannel, image}) => {       // image is in Buffer format here
      const user = getCurrentUser(socket.id)
      
      if (isChannel) {
         messagesArr.push({msg: formatMessage(user.username, msg, image), room: user.room })
         io.to(user.room).emit('message', {msg: formatMessage(user.username, msg, image) })
      } else {
         privatMessages.push({msg: formatMessage(user.username, msg, image), receiver: receiverName, sender: senderName, room: user.room })
         socket.emit('message', {msg: formatMessage(user.username, msg, image) })
         io.to(receiver).emit('message', {msg: formatMessage(user.username, msg, image)})
         
         const privateMsgs = privatMessages.filter(el => 
            (el.receiver === receiverName && el.sender === senderName) || (el.receiver === senderName && el.sender === receiverName)
         )
         
         socket.emit('messages count', {count: privateMsgs.length, receiver})
         socket.broadcast.to(receiver).emit('messages count', {count: privateMsgs.length, receiver: user.id})
      }
   })

   // socket.on('upload', (file/* , callback */) => {
   //    //console.log(file);
   //    socket.emit('message', file)
   // })

   // Runs when client disconnects
   socket.on('disconnect', () => {
      const user = userLeave(socket.id)

      if (user) {
         io.to(user.room).emit('message', {msg: formatMessage(botName, `${user.username} has left the chat`)} );

         // Send users and room info
         io.to(user.room).emit('roomUsers', { 
            room: user.room, 
            users: getRoomUsers(user.room) 
         })
      }
   })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log(`listening for requests on port ${PORT},`))


// PS:
// socket.emit() -> to a single client who is connecting
// socket.broadcast.emit() -> to all clients exept the one connecting
// io.emit() -> to all connected clients
// 
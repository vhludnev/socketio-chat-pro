const sideBar = document.querySelector('.chat-sidebar'), 
      leaveBtn = document.getElementById('leave-btn'),
      toggleMenu = document.getElementById('toggle-menu'),
      roomName = document.getElementById('room-name'),
      userList = document.getElementById('users'),
      chatBox = document.querySelector('.chat-box'),
      chatMessages = document.querySelector('.chat-messages'),
      uploadedImages = chatMessages.querySelectorAll('.uploadimage'),
      feedback = document.getElementById('feedback'),
      chatForm = document.getElementById('chat-form'),
      msgInput = chatForm.querySelector('#msg'),
      input = document.getElementById('upload'),
      button = document.querySelector('#emoji-button');

// Make connection
const socket = io()

// Get username and room from URL
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });
leaveBtn.textContent = `Leave ${room}`

// Join chatroom
socket.emit('joinRoom', { username, room });

// Get room and users
socket.on('roomUsers', ({ room, users }) => {
   outputRoomName(room);
   outputUsers(users);
});

// Message from server
socket.on('message', ({ msg }) => {
   outputMessage(msg);
   botMessagesStyle();
})

// Private messages count
socket.on('messages count', ({ count, receiver }) => {
   const messagesCountElement = userList.querySelector(`[data-id="${receiver}"]`).children[0];
   messagesCountElement.textContent = count;
   messagesCountElement.style.borderColor = 'inherit'
})

// Send user is typing
socket.on('typing', data => {
   if (data) {
      feedback.innerHTML = '<p><em>' + data + ' is typing a message...</em></p>'
   } else {
      feedback.innerHTML = ''
   }
})

// Emoji picker
const picker = new EmojiButton({
   theme: 'auto',
   position: 'top-start',
   emojiSize: '22px',
   emojisPerRow: 10,
   showVariants: false
})
picker.on('emoji', emoji => {
   if (msgInput.value) {
      msgInput.value += ' ' + emoji + ' ';
   } else {
      msgInput.value += emoji + ' ';
   }
   setTimeout(() => msgInput.focus(), 0)
})
button.addEventListener('click', () => {
   picker.togglePicker(button);
})

// Toggle menu on mobile version
toggleMenu.addEventListener('click', () => {
   const sideBarDisplay = window.getComputedStyle(sideBar, null).getPropertyValue('display');
   if (sideBarDisplay === 'none') {
      sideBar.classList.add('mobile-show');
   } else {
      sideBar.classList.remove('mobile-show');
   }
})

// Image upload
input.addEventListener('change', () => {
   const file = document.querySelector("input[type=file]").files[0];
   const imageObject = { type: 'file', body: file, mimeType: file.type, fileName: file.name }
   outputImageMessage(imageObject);
})

// Message submit
chatForm.addEventListener('submit', e => {
   e.preventDefault();
 
   const msgElement = e.target.elements.msg;
   // Get message text
   let msg = msgElement.value;
 
   msg = msg.trim();

   if (!msg) {
     return false;
   }
   
   if (!msgElement.dataset.sendId) {
      // Emit message to server
      socket.emit('chatMessage', { msg, isChannel: true });
   } else {
      socket.emit('chatMessage', { msg, receiver: msgElement.dataset.sendId, receiverName: msgInput.placeholder.split('Enter private message to ')[1], senderName: username });
   }
   
   // Clear input & focus input field after send
   msgElement.value = '';
   msgElement.focus();
});


// Retrive messages and change color of clicked room's user to send a private message
userList.addEventListener('click', (e) => {
   const clickedUserId = e.target.dataset.id;
   const receiver = e.target.childNodes[0].nodeValue;

   if (!receiver) {
      return;
   }

   socket.emit('receiver', { receiver, sender: username, allMsgs: msgInput.dataset.sendId === clickedUserId })  

   sideBar.classList.remove('mobile-show');

   if (msgInput.dataset.sendId) {                                 //  Private Chat Activated
      chatBox.style.backgroundColor = 'inherit';                  //  reset background color
      if (msgInput.dataset.sendId === clickedUserId) {
         userList.childNodes.forEach(el => {
            if (el.textContent !== username) {
               el.classList.remove('receiver');
               if (el.children[0].textContent !== '') {
                  el.children[0].style.borderColor = 'inherit';
               }
            }
         });
         msgInput.placeholder = 'Enter message';
         msgInput.dataset.sendId = '';

         socket.on('roomMessages', ({ messages }) => {
            if (messages?.length) {
               chatMessages.innerHTML = '';
               messages.forEach(({ msg }) => outputMessage(msg));
               botMessagesStyle();
            }
         })
         return;
      } else {
         // Toggling user names
         userList.childNodes.forEach(el => {
            if (el.textContent !== username) {
               el.classList.remove('receiver');
               if (el.children[0].textContent !== '') {                 // t.i. messages count !== 0
                  el.children[0].style.borderColor = 'inherit';
               }
            }
         });
         chatBox.style.backgroundColor = 'var(--private-color)';
         e.target.classList.add('receiver');
         sideBar.classList.remove('mobile-show');
         if (e.target.children[0].textContent !== '') {
            e.target.children[0].style.borderColor = 'yellow';
         }
         msgInput.placeholder = `Enter private message to ${receiver}`;
         msgInput.dataset.sendId = clickedUserId;
      }
   } else {
      chatBox.style.backgroundColor = 'var(--private-color)';
      e.target.classList.add('receiver');
      if (e.target.children[0].textContent !== '') {
         e.target.children[0].style.borderColor = 'yellow';
      }
      msgInput.placeholder = `Enter private message to ${receiver}`;
      msgInput.dataset.sendId = clickedUserId;

      socket.on('retrievePrivateMsgs', ({ messages }) => {
         if (messages?.length) {
            chatMessages.innerHTML = '';
            messages.forEach(({ msg }) => outputMessage(msg));
            botMessagesStyle();
         }
      })
   }
})

// Prompt the user before leave chat room
document.querySelectorAll('.leave-btn').forEach(btn => btn.addEventListener('click', () => {
   const leaveRoom = confirm(`Are you sure you want to leave the ${room}?`);
   if (leaveRoom) {
      window.location = '../index.html';
   }
}))

// Prompt the user before leave chat room
roomName.addEventListener('click', () => {
   sideBar.classList.remove('mobile-show');
   chatBox.style.backgroundColor = 'inherit';
   userList.childNodes.forEach(el => {
      el.classList.remove('receiver')
   })
   msgInput.placeholder = 'Enter message';
   msgInput.dataset.sendId = '';
   
   socket.emit('receiver', { allMsgs: true })
   socket.on('roomMessages', ({ messages }) => {
      if (messages?.length) {
         chatMessages.innerHTML = '';
         messages.forEach(({ msg }) => outputMessage(msg));
         botMessagesStyle();
      }
   })
})

// Typing tracking
msgInput.addEventListener('keypress', (e) => {
   socket.emit('typing', ({ data: username, id: e.target.dataset.sendId }))
})
msgInput.addEventListener('blur', (e) => {
   socket.emit('typing', ({}))
})

// Output message to DOM
function outputMessage(msg) {
   feedback.innerHTML = '';
   const div = document.createElement('div');
   div.classList.add('message');

   // Style personal messages 
   if (username === msg.username) {
      div.classList.add('special');
   };

   const p = document.createElement('p');
   p.classList.add('meta');
   p.innerText = username === msg.username ? 'Me' : msg.username;
   p.innerHTML += `<span> at ${msg.time}</span>`;
   div.appendChild(p);

   if (!msg.image) {
      const para = document.createElement('p');
      para.classList.add('text');
      para.innerText = msg.text;
      div.appendChild(para);
   } else {
      const blob = new Blob([msg.image.body], { type: msg.image.mimeType });   // converting images bites to Blob
      const reader = new FileReader();
      //const file = document.querySelector("input[type=file]").files[0];
      //const file = new File([blob], msg.image.fileName, { type: msg.image.mimeType });
      reader.readAsDataURL(blob);                                          // converting Blob to blowser readable image src
      reader.onloadend = () => { 
         if (['image/png', 'image/gif', 'image/jpeg', 'image/webp'].includes(msg.image.mimeType)) {
            const img = document.createElement('img');
            img.classList.add('uploadimage');
            img.src = reader.result;
            img.alt = msg.image.fileName;
            div.appendChild(img);
         } else if (['application/pdf', 'image/svg+xml'].includes(msg.image.mimeType)) {
            const object = document.createElement('object');
            object.classList.add('uploadfile');
            object.data = reader.result;
            div.appendChild(object);
         }
      }   
   }

   chatMessages.appendChild(div);
}

// Add room name to DOM
function outputRoomName(room) {
   roomName.innerText = room;
}

// Add a message with image
function outputImageMessage(imageObject) {
   if (!msgInput.dataset.sendId) {
      // Emit message to server
      socket.emit('chatMessage', { msg: '', image: imageObject, isChannel: true });
   } else {
      socket.emit('chatMessage', { msg: '', image: imageObject, receiver: msgInput.dataset.sendId, receiverName: msgInput.placeholder.split('Enter private message to ')[1], senderName: username });
   }

   msgInput.focus();
}
 
// Add users to DOM (sort names alphabetically)
function outputUsers(users) {
   userList.innerHTML = '';   // userList.innerHTML = `${users.map(user => `<li>${user.username}</li>`).join('')}`;   
   users.sort((a, b) => a.username.localeCompare(b.username)).forEach(user => {
      const li = document.createElement('li');
      li.innerText = user.username;
      li.dataset.id = user.id;
      if (username === user.username) {
         li.style.color = 'wheat';
         li.style.pointerEvents = 'none';
      } else {
         const span = document.createElement('span');
         span.classList.add('count');
         li.appendChild(span);
      }
      userList.appendChild(li);
   })
}

function botMessagesStyle() {
   const botName = chatMessages.querySelectorAll('.message .meta')[0]
   chatMessages.querySelectorAll('.message .meta').forEach(m => {
      if (m.childNodes[0].textContent === botName.childNodes[0].textContent) {
         m.parentElement.classList.add('bot');
      }
   })
   // Scroll down
   chatMessages.scrollTop = chatMessages.scrollHeight;
}
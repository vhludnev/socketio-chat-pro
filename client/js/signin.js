const signinForm = document.getElementById('signin-form'),
      nameInput = signinForm.querySelector('#username'),
      roomSelect = signinForm.querySelector('#room'),
      error = document.querySelector('.error-message');

// // Make connection
const socket = io()

// // Verify new user
signinForm.addEventListener('submit', async (e) => {
   e.preventDefault();
   const username = nameInput.value;
   const room = roomSelect.options[roomSelect.selectedIndex].value;

   error.style.display = 'none';
   
   // Check New User name
   await socket.emit('checkUser', { username, room });

   await socket.on('checkRoomNames', ({ nameExists }) => {
      if (!nameExists) {
         signinForm.action = '../chat.html';
         signinForm.submit();
      } else {
         error.style.display = 'block';
      }
   });
})


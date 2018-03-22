var socket = new WebSocket('ws://localhost:8081');

var links = document.querySelectorAll('a');
const main = document.querySelector('.main');
var message = document.querySelector('.message');
const fileViewerParent = document.querySelector('.columns__item--file-viewer');
const logsParent = document.querySelector('.logs__content');
const branchesParent = document.querySelector('.columns__item--branches');
const filesParent = document.querySelector('.columns__item--files');
let messageText = '';

// Keep links always clickable
main.addEventListener('click', (event) => {
  // return;
  const target = event.target;
  if (target.tagName !== 'A') {
    return;
  }
  event.preventDefault();
  var outgoingMessage = target.getAttribute('href').substr(1);
  socket.send(outgoingMessage);
});

socket.onopen = function() {
  messageText = 'Соединение установлено.';
  console.log(messageText);
  message.innerHTML = messageText;
};

socket.onclose = function(event) {
  if (event.wasClean) {
    messageText = 'Соединение закрыто чисто';
    console.log(messageText);
    message.innerHTML = messageText;
  }
  else {
    messageText = 'Обрыв соединения'; // например, 'убит' процесс сервера
    console.log(messageText);
    message.innerHTML = messageText;
  }
  console.log('Код: ' + event.code + ' причина: ' + event.reason);
  message.innerHTML = 'Код: ' + event.code + ' причина: ' + event.reason;
};

socket.onmessage = function(event) {
  const response = JSON.parse(event.data);
  messageText = 'Получены данные ';
  message.innerHTML = messageText;

  if (response.command === 'file') {
    fileViewerParent.innerHTML = (response.data);
  }
  else if (response.command === 'logs') {
    logsParent.innerHTML = (response.data);
  }
  else if (response.command === 'branch') {
    branchesParent.innerHTML = (response.data.branches);
    filesParent.innerHTML = (response.data.files);
    fileViewerParent.innerHTML = '';
  }
};

socket.onerror = function(error) {
  console.log('Ошибка ' + error.message);
  message.innerHTML = 'Ошибка ' + error.message;
};

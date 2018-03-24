const socket = new WebSocket(`ws://${config.host}:8081`);
const main = document.querySelector('.main');
const message = document.querySelector('.message');
let messageText = '';
const fileViewerParent = document.querySelector('.columns__item--file-viewer');
const logsParent = document.querySelector('.logs__content');
const branchesParent = document.querySelector('.columns__item--branches');
const filesParent = document.querySelector('.columns__item--files');

// If connection works
if (socket.readyState !== 3) {
// Keep links always clickable
  main.addEventListener('click', (event) => {
    const target = event.target;
    if (target.tagName !== 'A') {
      return;
    }
    event.preventDefault();
    let outgoingMessage = target.getAttribute('href').substr(1);
    socket.send(outgoingMessage);
  });
}

socket.onopen = function () {
  messageText = 'Соединение установлено.';
  console.log(messageText);
  message.innerHTML = messageText;
};

socket.onclose = function (event) {
  if (event.wasClean) {
    messageText = 'Соединение закрыто чисто';
    console.log(messageText);
    message.innerHTML = messageText;
  } else {
    messageText = 'Обрыв соединения'; // например, 'убит' процесс сервера
    console.log(messageText);
    message.innerHTML = messageText;
  }

  let reason = event.reason ? `Причина: ${event.reason}.` : '';
  messageText = `Соединение прервано.${reason} Страница будет обновлена.`;
  console.log(messageText);
  message.innerHTML = messageText;

  // TEMPORARY
  document.location.reload();
};

socket.onmessage = function (event) {
  const response = JSON.parse(event.data);
  messageText = 'Получены данные ';
  message.innerHTML = messageText;

  if (response.command === 'file') {
    fileViewerParent.innerHTML = (response.data);
  } else if (response.command === 'folder') {
    // console.log('response.command FOLDER');
    // console.log(response.data.files);
    filesParent.innerHTML = (response.data.files);
    fileViewerParent.innerHTML = '';
  } else if (response.command === 'branch') {
    branchesParent.innerHTML = (response.data.branches);
    filesParent.innerHTML = (response.data.files);
    fileViewerParent.innerHTML = '';
  }
};

socket.onerror = function (error) {
  console.log('Ошибка ' + error.message);
  message.innerHTML = 'Ошибка ' + error.message;
};

let wsProtocol = 'ws';
if (window.location.protocol === 'https') {
  wsProtocol = 'wss';
}
const socket = new WebSocket(`${wsProtocol}://${config.host}:8081`);
const main = document.querySelector('.main');
const message = document.querySelector('.message');
let messageText = '';
const fileViewerParent = document.querySelector('.columns__item--file-viewer');
const logsParent = document.querySelector('.logs__content');
const branchesParent = document.querySelector('.columns__item--branches');
const filesParent = document.querySelector('.columns__item--files');
let currentElem;
const filesLinkCurrentClass = 'files__link--current';

// If connection works
if (socket.readyState !== 3) {
// Keep links always clickable
  addLinksListener();
}

// ------------------------------

function linkEvent(event) {
  const target = event.target;
  const isFile = target.classList.contains('files__link--file');
  if (target.tagName !== 'A') {
    return;
  }
  event.preventDefault();

  if (isFile) {
    if (currentElem) {
      currentElem.classList.remove(filesLinkCurrentClass);
    }

    currentElem = target;
    currentElem.classList.add(filesLinkCurrentClass);
  }

  let outgoingMessage = target.getAttribute('href').substr(1);
  socket.send(outgoingMessage);
}

// ------------------------------

function addLinksListener() {
  main.addEventListener('click', linkEvent);
}

// ------------------------------

function removeLinksListener() {
  main.removeEventListener('click', linkEvent);
}

// ------------------------------

socket.onopen = function () {
  messageText = 'Соединение установлено.';
  // console.log(messageText);
};

// ------------------------------

socket.onclose = function (event) {
  if (event.wasClean) {
    messageText = 'Соединение закрыто чисто';
    // console.log(messageText);
  } else {
    messageText = 'Обрыв соединения'; // например, 'убит' процесс сервера
    // console.log(messageText);
  }

  let reason = event.reason ? `Причина: ${event.reason}.` : '';
  messageText = `Соединение прервано.${reason}.`;
  removeLinksListener();
  // console.log(messageText);
};

// ------------------------------

socket.onmessage = function (event) {
  const response = JSON.parse(event.data);
  messageText = 'Получены данные ';

  if (response.command === 'file') {
    fileViewerParent.innerHTML = (response.data);

  } else if (response.command === 'folder') {
    filesParent.innerHTML = (response.data.files);
    fileViewerParent.innerHTML = '';

  } else if (response.command === 'branch') {
    branchesParent.innerHTML = (response.data.branches);
    filesParent.innerHTML = (response.data.files);
    fileViewerParent.innerHTML = '';
  }
};

// ------------------------------

socket.onerror = function (error) {
  removeLinksListener();
  // console.log('Ошибка ' + error.message);
};

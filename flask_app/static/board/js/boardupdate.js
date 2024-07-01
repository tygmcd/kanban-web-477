// Script for handling all communication and live updates


// Various document elements
const addListButton = document.getElementById('addlistbtn');
const addListForm = document.getElementById('addlistform');
const createListButton = document.getElementById('createlist');
const cancelListButton = document.getElementById('cancellist');

const cards = document.getElementsByClassName("card");
const lists = document.getElementsByClassName("list-block");

// ########################################################################
// SOCKET
// ########################################################################

// Connect socket at path defined in url
path = window.location.pathname;

// Slice path to get board id
const id = path.split('/').slice(-1);

var socket;
$(document).ready(function() {

    socket = io.connect('https://' + document.domain + ':' + location.port + '/board');
    socket.on('connect', function() {
        socket.emit('joined', {"board_id" : id});
    });

    // Test socket event
    socket.on('test', function(data) {
        console.log(data.msg)
    });

    // Listener to draw a new card
    socket.on("drawcard", function(data) {
        const listid = "list-" + data.list_id

        let card  = document.createElement("div");
        let list = document.getElementById(listid);
        card.className = "card";
        card.draggable = "true";
        card.ondragstart = dragStartHandler;
        card.id = "card-" + data.card_id

        // TEXTAREA
        let textarea = document.createElement("textarea");
        textarea.className = "textarea c";
        textarea.id = "edit-" + data.card_id;
        textarea.value = "Enter Text Here";
        textarea.readOnly = true;
        textarea.onkeypress = function() { commitCard(event, data)} ;
        card.appendChild(textarea);

        // BUTTONS
        let buttons = document.createElement("div");
        buttons.className = "buttons";
        
        let edit = document.createElement("button");
        edit.className = "btn ce";
        edit.id = "b-edit-" + data.card_id;
        edit.textContent = "Edit";
        edit.addEventListener('click', editCard);

        // edit.onclick = function() { editCard(data) } ;

        let del = document.createElement("button");
        del.className = "btn cd";
        del.id = "b-delete-" + data.card_id;
        del.textContent = "Delete";
        del.addEventListener('click', deleteCard);

        // Add children
        buttons.appendChild(edit);
        buttons.appendChild(del);
        card.appendChild(buttons);

        list.appendChild(card);

        // Scroll to bottom of list when new card is added
        list.scrollTop = list.scrollHeight;
    });

    // Listener for updatecard socket event
    socket.on("updatecard", function(data) {
        const textarea_id = "edit-" + data.card_id;
        const currentTextarea = document.getElementById(textarea_id);
        currentTextarea.value = data.content;
    });

    // Listener for removecard socket event
    socket.on("removecard", function(data) {
        const card_id = "card-" + data.card_id;
        const currentCard = document.getElementById(card_id);
        currentCard.remove();
    });

    // Listener for completed drag socket event
    socket.on("completedrag", function(data) {
        const currentCard = document.getElementById(data["source_card_id"]);
        const destList = document.getElementById(data["dest_list_id"]);
        destList.appendChild(currentCard);
    });

    // Listener for incoming message socket event
    socket.on("incomingmsg", function(data) {
        const chatWindow = document.getElementById("chat-window");
        const tag = document.createElement("p");
        const text = document.createTextNode(data.msg);
        tag.style.cssText = data.style;
        tag.appendChild(text);
        chatWindow.appendChild(tag);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    });
});

// ########################################################################
// CARD ADDING, EDITING, AND DELETING
// ########################################################################

// Adds card via socket.io
function addCard(data) {
    if (typeof data === "string") {
        data = JSON.parse(data.replace(/'/g, "\""));
    }
    socket.emit("addcard", data);
}

// Add event listeners to all edit buttons
const editCardButtons = document.querySelectorAll('.btn.ce');
editCardButtons.forEach(editCardButton => {
    editCardButton.addEventListener('click', editCard);
});

// Edit card via socket.io
function editCard(event) {
    const buttonId = event.target.id;
    let cardId = buttonId.split('-');
    cardId = cardId[cardId.length - 1];

    const currentTextarea = document.getElementById("edit-" + cardId);
    currentTextarea.readOnly = !currentTextarea.readOnly;

    // Focus into text box when edit button clicked
    if (!currentTextarea.readOnly) {
        currentTextarea.focus();
        currentTextarea.selectionStart = currentTextarea.selectionEnd = currentTextarea.value.length;
    }
  
    // Changes edit button to green when clicked on
    if (event.target.style.backgroundColor === '') {
        event.target.style.backgroundColor = '#53A653';
    } else {
        event.target.style.backgroundColor = '';
        commitCardEditButton(cardId);
    }

}

// Add event listeners to all delete buttons
const deleteCardButtons = document.querySelectorAll('.btn.cd');
deleteCardButtons.forEach(deleteCardButton => {
    deleteCardButton.addEventListener('click', deleteCard);
});

// Deletes card live from board and db
function deleteCard(event) {
    const buttonId = event.target.id;
    let cardId = buttonId.split('-');
    cardId = cardId[cardId.length - 1];
    data = {
        "card_id" : cardId,
        "board_id" : id
    };
    socket.emit("deletecard", data);
}

// Commits card to db when enter key is pressed in textarea
function commitCard(event, data) {
    // Check if keypress was enter key
    if (event.keyCode == 13) {
        // Prevent mewline behavior with enter key
        event.preventDefault();
        if (typeof data === "string") {
            data = JSON.parse(data.replace(/'/g, "\""));
        }
        const currentTextarea = document.getElementById("edit-" + data.card_id);
        const currentEditButton = document.getElementById("b-edit-" + data.card_id);
        currentEditButton.style.backgroundColor = "";
        data.content = currentTextarea.value;
        currentTextarea.readOnly = !currentTextarea.readOnly;
        data.board_id = id;
        socket.emit('commitcard', data);
    }
}

// Works the same as above function but is based on edit button, not enter key
function commitCardEditButton(cardId) {
    const currentTextarea = document.getElementById("edit-" + cardId);
    data = {
        "content" : currentTextarea.value,
        "board_id" : id,
        "card_id" : cardId
    };
    socket.emit('commitcard', data);

}

// ########################################################################
// DRAG AND DROP HANDLERS
// ########################################################################


// Sets transfer data when drag event begins
function dragStartHandler(e) {
    e.dataTransfer.setData('text/plain', e.target.id);
}

// Prevents default behavior for dragOver
function dragOverHandler(e) {
    e.preventDefault();
}

// Retrieves landing spot for card, sends that info to backend to update db
function dropHandler(e) {
    e.preventDefault();
    card_id = e.dataTransfer.getData('text/plain');

    sourceCard = document.getElementById(card_id);
    destList = document.getElementById(e.target.id);

    // Only allow drop if the element is a list block
    if (destList.classList.contains('list-block')) {
        destList.appendChild(sourceCard);
        data = {
            "source_card_id" : card_id,
            "dest_list_id" : e.target.id,
            "board_id" : id
        };
        socket.emit("carddragged", data);
    } else {
        console.log("Element cannot be dropped in this location");
    }

}

// ADD ALL EVENT LISTENERS FOR DRAG AND DROP
for (card of cards) {
    card.addEventListener("dragstart", dragStartHandler);
}

for (list of lists) {
    list.addEventListener("dragover", dragOverHandler);
    list.addEventListener("drop", dropHandler);
}

// ########################################################################
// CHAT
// ########################################################################

// Various document elements related to chat
const mainContent = document.getElementById('main-c-id');
const listContainer = document.getElementById('list-c-id');
const chat = document.getElementById('chat-container');
const chatToggle = document.getElementById('c-toggle');
const chatField = document.getElementById('field-chat');
const chatSendButton = document.getElementById('btn-chat');

// Add event listener to chat toggle button, opens and closes chat
chatToggle.addEventListener('click', (event) => {
    if (chat.style.display =='none' ||
        chat.style.display === '') {
            chat.style.display = 'flex';
            listContainer.width = '50%;';
            if ( window.innerWidth <= 850 ) {
                window.scrollTo(0, document.body.scrollHeight);
            }
            socket.emit('chatstatus', {"board_id" : id, "joined" : 1});
    
    } else {
        chat.style.display = 'none';
        listContainer.width = '100%;';
        socket.emit('chatstatus', {"board_id" : id, "joined" : 0});
    }
});

// Event listener for send button, sends msg to db
chatSendButton.addEventListener('click', (event) => {
    const message = chatField.value;
    socket.emit('message-sent', {'msg' : message, 'board_id':  id});
    chatField.value = "";
});

// Adds enter key support for chat send button
chat.addEventListener('keypress', (event) => {
    if (event.keyCode == 13) {
        chatSendButton.click();
    }
});

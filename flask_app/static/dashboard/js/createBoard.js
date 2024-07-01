// Script for creating a board

// Various document elements
const createButton = document.getElementById('create-b-btn');
const createBox = document.getElementById('create-box');
const errorMsg = document.createElement('div');

// Event listener for create button
createButton.addEventListener('click', (event) => {
    const projName = document.getElementById('create-projname').value;
    const members = document.getElementById('create-members').value;

    const board_data = {
        "name" : projName,
        "members" : members
    };

    // SEND DATA TO SERVER VIA jQuery.ajax({})
    jQuery.ajax({
        url: "/createboard",
        data: board_data,
        type: "POST",
        // Need to redirect upon success
        success:function(returned_data) {
            errorMsg.innerHTML = "";
            returned_data = JSON.parse(returned_data);
            if (returned_data['success'] === 1) {
                document.getElementById('create-projname').value = "";
                document.getElementById('create-members').value = "";
                window.location.href = "/board/" + returned_data['id']
            } else {
                errorMsg.innerHTML = "<p>Board Creation Failed</p>";
                errorMsg.style.color = "red";
                createBox.appendChild(errorMsg);
            };
        }
    });
    event.preventDefault();
});
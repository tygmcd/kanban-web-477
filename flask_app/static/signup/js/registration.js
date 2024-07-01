// Script used to register a user in db

// Sign up button element
const signupButton = document.getElementById('subutton');

// Add click event listener to signup button, retrieves new user info
signupButton.addEventListener('click', (event) => {
    const firstname = document.getElementById('new-fn').value;
    const lastname = document.getElementById('new-ln').value;
    const email = document.getElementById('new-email').value;
    const password = document.getElementById('new-pw').value;
    const password_c = document.getElementById('new-pw-c').value;

    const new_user_data = {
        'firstname' : firstname,
        'lastname' : lastname,
        'email' : email,
        'password' : password,
        'password_c' : password_c
    };

    // SEND DATA TO SERVER VIA jQuery.ajax({})
    jQuery.ajax({
        url: "/processsignup",
        data: new_user_data,
        type: "POST",
        success:function(returned_data) {
            returned_data = JSON.parse(returned_data);
            if (returned_data['success'] === 0) {
                $('.auth-message').empty();
                $('.auth-message').append("Registration failed. Email already exists.");
            // Code 2 represents password mismatch
            } else if (returned_data['success'] === 2) {
                $('.auth-message').empty();
                $('.auth-message').append("Registration failed. Passwords do not match.");
            } else {
                const query_string = window.location.search;
                const url_params = new URLSearchParams(query_string);
                const next = url_params.get('next');
                if (next !== null) {
                    window.location.href = next;
                } else {
                    window.location.href = "/signin";
                }
            }
        }
    });
    event.preventDefault();
});
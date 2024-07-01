// Script used to login a user

// Signin button element
signinButton = document.getElementById('sibutton');

// Add click event listener to button, retrieve login data
signinButton.addEventListener('click', (event) => {
    const email = document.getElementById('user-email').value;
    const password = document.getElementById('user-pw').value;

    const login_data = {
        'email' : email,
        'password' : password
    };

    // SEND DATA TO SERVER VIA jQuery.ajax({})
    jQuery.ajax({
        url: "/processsignin",
        data: login_data,
        type: "POST",
        success:function(returned_data) {
            returned_data = JSON.parse(returned_data);
            if (returned_data['success'] === 0) {
                $('.auth-message').empty();
                $('.auth-message').append("Email or password is invalid.");
            } else {
                const query_string = window.location.search;
                const url_params = new URLSearchParams(query_string);
                const next = url_params.get('next');
                if (next !== null) {
                    window.location.href = next;
                } else {
                    window.location.href = "/dashboard";
                }
            }
        }
    });

    event.preventDefault();
});
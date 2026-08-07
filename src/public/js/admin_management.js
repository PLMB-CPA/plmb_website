document.addEventListener("DOMContentLoaded", function() {

    fetch('/api/admin/users')
        .then(function(response) {
            return response.json();
        })
        .then(function(admins) {
            let container = document.getElementById('admin-list');

            for (let i = 0; i < admins.length; i++) {
                let admin = admins[i];

                let row = document.createElement('div');
                row.className = 'user-row';

                row.innerHTML = '' +
                    '<div class="user-info">' +
                    '    <h3>' + admin.username + '</h3>' +
                    '    <p></p>' +
                    '</div>' +
                    '<div class="status active">' +
                    '    <p> ● Active </p>' +
                    '</div>' +
                    /* to be added in once theres proper tracking of stats for admins 
                    '<div class="user-stat">' +
                    '    <h3>0</h3>' +
                    '    <p>Inquiries Answered</p>' +
                    '</div>' +
                    '<div class="user-stat">' +
                    '    <h3>0</h3>' +
                    '    <p>Newsletters Reviewed</p>' +
                    '</div>' +
                    '<div class="user-stat">' +
                    '    <h3>0</h3>' +
                    '    <p>Newsletters Published</p>' +
                    '</div>' +
                    */
                    '<div class="dropdown-btn">' +
                    '    <button class="more-btn">⋮</button>' +
                    '    <div class="dropdown-content">' +
                    '        <button class="change-pass-ad" data-admin-id="' + admin._id + '">Change Password</button>' +
                    '        <button class="delete-ad" data-admin-id="' + admin._id + '">Delete</button>' +
                    '    </div>' +
                    '</div>';

                container.appendChild(row);
            }
        })
        .catch(function() {
            let container = document.getElementById('admin-list');
            container.innerHTML = '<p>Failed to load admins.</p>';
        });

});


document.body.addEventListener('click', function(event) {
    let moreButton = event.target.closest('.more-btn');
    if (moreButton) {
        let dropdown = moreButton.parentElement.querySelector('.dropdown-content');
        if (dropdown)
            dropdown.classList.toggle('show');
    }
});


document.body.addEventListener('click', function(event) {
    let changeButton = event.target.closest('.change-pass-ad');
    if (changeButton) {
        let adminId = changeButton.getAttribute('data-admin-id');
        window.location.href = 'admin_creation.html?mode=change&id=' + adminId;
    }
});


document.body.addEventListener('click', function(event) {
    let deleteButton = event.target.closest('.delete-ad');
    if (deleteButton) {
        let adminId = deleteButton.getAttribute('data-admin-id');
        let confirmed = confirm('Are you sure you want to delete this admin?');

        if (!confirmed)
            return;

        fetch('/api/admin/users/' + adminId, { method: 'DELETE' })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                if (data.error)
                    alert(data.error);
                else {
                    alert(data.message);
                    deleteButton.closest('.user-row').remove();
                }
            })
            .catch(function() {
                alert('Failed to delete admin.');
            });
    }
});